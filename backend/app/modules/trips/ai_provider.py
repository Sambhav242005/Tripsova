"""
Tripova Trip Planner.

Two layers:
  1. Rule-based multi-factor planner (style scoring, diet pairing, variety,
     budget allocation, safety) — always runs and is the source of truth for
     which places/food are recommended.
  2. Optional AI itinerary generation via any OpenAI-compatible endpoint
     (AI_ENABLED=true; provider/model/key set in config — defaults to a local
     Ollama serving gemma4:31b-cloud): the model rewrites the day-by-day itinerary
     and summary using only the places the rule-based layer selected. Any failure
     falls back to layer 1.
"""

import logging
from math import log10
from itertools import cycle
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.trips.feasibility import check_leg_feasibility, leg_warning
from app.modules.trips.geocode import GeocodeError, geocode_city
from app.modules.trips.live_places import fetch_live_pois
from app.modules.trips.route_planner import plan_route
from app.modules.trips.transport import echo_mode, leg_cost, resolve_transport
from app.shared.utils import utcnow

logger = logging.getLogger("tripsova.ai")


def _leg_point(d: dict) -> dict:
    """Strip a geocoded/catalogue point down to the {name, lat, lng} a leg needs."""
    return {"name": d["name"], "latitude": d["latitude"], "longitude": d["longitude"]}

# ─── Style-to-place-type mapping ──────────────────────────────────────────────
STYLE_TYPE_MAP = {
    "adventure": {"TREK", "VIEWPOINT", "TOURIST_SPOT", "EXPERIENCE", "TRANSPORT"},
    "nature": {"VIEWPOINT", "TREK", "TOURIST_SPOT", "EXPERIENCE"},
    "cultural": {"TOURIST_SPOT", "EXPERIENCE"},
    "food": {"RESTAURANT", "CAFE"},
    "relaxation": {"CAFE", "VIEWPOINT", "HOTEL", "HOMESTAY"},
    "photography": {"VIEWPOINT", "TOURIST_SPOT", "TREK"},
    "shopping": {"TOURIST_SPOT", "EXPERIENCE"},
    "spiritual": {"TOURIST_SPOT"},
    "wellness": {"HOTEL", "HOMESTAY", "EXPERIENCE"},
}

DAY_ARCHETYPES = [
    "arrival", "exploration", "deep_dive", "adventure", "relaxation", "departure",
]


# ─── AI itinerary schema (structured output) ──────────────────────────────────
class AISlot(BaseModel):
    activity: str
    place_type: Optional[str] = None
    food_match: Optional[str] = None
    budget_share: str


class AIDay(BaseModel):
    day: int
    archetype: str
    title: str
    morning: AISlot
    afternoon: AISlot
    evening: AISlot


class AIItinerary(BaseModel):
    summary: str
    days: list[AIDay]


AI_SYSTEM_PROMPT = (
    "You are Tripova's trip planner for travel in India. You receive a traveller "
    "profile and a pre-scored list of real places and food spots for one destination. "
    "Build a realistic day-by-day itinerary. Rules: use only place and food names "
    "from the provided lists (never invent places); produce exactly the requested "
    "number of days; respect the traveller's styles and diet; keep budget_share "
    "values as percentages summing to roughly 100% per day; write the summary as "
    "2-3 friendly sentences."
)


def _build_ai_prompt(planner: "TripPlanner", base: dict) -> str:
    places = [
        f"- {p['place']['name']} (type={p['place']['type']}, score={p['score']})"
        for p in planner.scored_places[:12]
    ]
    foods = [
        f"- {f['place']['name']} (diet_tags={f['place'].get('diet_tags') or []}, score={f['score']})"
        for f in planner.scored_food[:12]
    ]
    safety = "; ".join(base.get("safetyNotes") or [])
    return (
        f"Destination: {base.get('destinationName')}\n"
        f"Days: {planner.days}\n"
        f"Trip type: {planner.trip_type}, people: {planner.people_count}\n"
        f"Travel mode to destination: {planner.travel_mode}\n"
        f"Travel styles: {', '.join(planner.travel_styles) or 'balanced'}\n"
        f"Diet preferences: {', '.join(planner.diet_preferences) or 'none'}\n"
        f"Total budget: INR {planner.budget}\n"
        f"Safety notes: {safety or 'none'}\n\n"
        f"Places (pre-scored, best first):\n" + ("\n".join(places) or "- none available") + "\n\n"
        f"Food spots (pre-scored, best first):\n" + ("\n".join(foods) or "- none available") + "\n\n"
        f"Create the itinerary for exactly {planner.days} day(s)."
    )


# We ask for plain JSON ("json_object") and describe the exact shape in the prompt,
# rather than a strict json_schema. Strict-schema mode is rejected (HTTP 400) by many
# OpenAI-compatible backends — including Ollama and some OpenRouter-routed models — which
# previously caused a silent fall back to the rule-based plan. json_object is broadly
# supported; the shape instruction + validation below keep the output well-formed.
_SCHEMA_INSTRUCTION = (
    "Return ONLY a JSON object (no markdown, no prose) with this exact shape:\n"
    '{"summary": "2-3 sentences", "days": [{"day": 1, "archetype": "arrival", '
    '"title": "string", '
    '"morning": {"activity": "string", "place_type": "string or null", '
    '"food_match": "string or null", "budget_share": "25%"}, '
    '"afternoon": {"activity": "string", "place_type": "string or null", '
    '"food_match": "string or null", "budget_share": "40%"}, '
    '"evening": {"activity": "string", "place_type": "string or null", '
    '"food_match": "string or null", "budget_share": "35%"}}]}'
)


async def _generate_ai_itinerary(prompt: str) -> AIItinerary:
    import httpx

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": AI_SYSTEM_PROMPT + "\n\n" + _SCHEMA_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
        "stream": False,
        "temperature": 0.4,
    }
    headers = {"Content-Type": "application/json"}
    # Local Ollama needs no key; hosted providers (OpenRouter/OpenAI) do.
    if settings.AI_API_KEY:
        headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"

    async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
        response = await client.post(settings.AI_API_URL, json=payload, headers=headers)
        if response.status_code >= 400:
            # Surface the provider's error body so failures are diagnosable, not silent.
            raise RuntimeError(
                f"AI provider returned HTTP {response.status_code}: {response.text[:500]}"
            )
        data = response.json()

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected AI response shape: {str(data)[:500]}") from exc

    if not content:
        raise ValueError("AI provider returned an empty itinerary")

    # Some models still wrap JSON in markdown fences even in JSON mode.
    text = content.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return AIItinerary.model_validate_json(text)


# ─── Guardrails: enforce the contract the prompt asks for ─────────────────────
def _coerce_share(value: str | None) -> float | None:
    """Parse a budget_share like '25%' or '25' into a float; None if unparseable."""
    if value is None:
        return None
    try:
        return float(str(value).strip().rstrip("%").strip())
    except (ValueError, TypeError):
        return None


def _validate_and_repair(ai: AIItinerary, planner: "TripPlanner") -> AIItinerary:
    """Enforce what the prompt asks for but a model may not honour.

    json_object validation guarantees *shape*, not *semantics*. So:
      - Day count must match the request — otherwise we reject (raise) and let
        plan_trip fall back to the rule-based plan with the correct length.
      - food_match must reference a real provided place/food; an invented name is
        blanked rather than shown to the user (repair, not discard).
      - budget_share percentages are renormalised to ~100% per day when they drift.

    Raising here is intentional: the caller's except-clause turns it into a clean
    fallback, so a fundamentally wrong generation can never reach the user.
    """
    if not ai.days:
        raise ValueError("AI returned no itinerary days")
    if len(ai.days) != planner.days:
        raise ValueError(f"AI returned {len(ai.days)} day(s); expected {planner.days}")

    # The names we actually sent the model — the only legal references back.
    allowed = {
        p["place"]["name"].strip().lower() for p in planner.scored_places[:12]
    } | {
        f["place"]["name"].strip().lower() for f in planner.scored_food[:12]
    }

    for idx, day in enumerate(ai.days, 1):
        day.day = idx  # normalise to sequential 1..N regardless of what the model numbered
        slots = [day.morning, day.afternoon, day.evening]

        # Blank invented place references — only when we have a list to check against
        # (a thinly-seeded destination sends an empty list; don't punish that case).
        if allowed:
            for slot in slots:
                if not slot.food_match:
                    continue
                fm = slot.food_match.strip().lower()
                # Tolerant match: exact, or either name contains the other
                # (handles "Vinayak Family Restaurant, Goa" vs the bare name).
                if not any(name == fm or name in fm or fm in name for name in allowed):
                    logger.warning("AI referenced unknown place '%s'; dropping it", slot.food_match)
                    slot.food_match = None

        # Renormalise budget shares to sum ~100% when the model lets them drift.
        shares = [_coerce_share(s.budget_share) for s in slots]
        total = sum(v for v in shares if v is not None)
        if total > 0 and abs(total - 100) > 5:
            for slot, share in zip(slots, shares):
                slot.budget_share = f"{round((share or 0) / total * 100)}%"

    return ai


# ─── Public entry point ───────────────────────────────────────────────────────
async def plan_trip(db: AsyncSession, data: dict) -> dict:
    planner = TripPlanner(db, data)
    result = await planner.build()

    if settings.AI_ENABLED:
        try:
            ai = await _generate_ai_itinerary(_build_ai_prompt(planner, result))
            ai = _validate_and_repair(ai, planner)
            result["itinerary"] = [
                {
                    "day": d.day,
                    "archetype": d.archetype,
                    "title": d.title,
                    "slots": {
                        "morning": d.morning.model_dump(exclude_none=True),
                        "afternoon": d.afternoon.model_dump(exclude_none=True),
                        "evening": d.evening.model_dump(exclude_none=True),
                    },
                }
                for d in ai.days
            ]
            result["summary"] = ai.summary
            result["aiGenerated"] = True
            return result
        except Exception:
            logger.exception("AI itinerary generation failed; falling back to rule-based plan")

    result["aiGenerated"] = False
    return result


# ─── The planner ──────────────────────────────────────────────────────────────
class TripPlanner:
    def __init__(self, db: AsyncSession, data: dict):
        self.db = db
        self.destination_name = (data.get("destination") or "").strip()
        # Optional starting point — drives the getting-there leg when supplied.
        self.origin_name = (data.get("origin") or "").strip()
        self.days = data.get("days", 3)
        self.budget = data.get("budget", 0)
        self.people_count = data.get("peopleCount", 1)
        self.trip_type = (data.get("tripType") or "SOLO").upper()
        self.travel_styles = data.get("travelStyle") or []
        self.diet_preferences = data.get("dietPreference") or []
        # travel_mode echoes the caller's input (LAND/AIR/WATER or a transport like
        # CAR/TRAIN/FLIGHT); refuel relevance is derived from the transport profile,
        # so fuel stops show for self-driven petrol vehicles only — not trains/flights.
        self.travel_mode = echo_mode(data.get("travelMode"))
        _, _profile = resolve_transport(self.travel_mode)
        self.refuel_relevant = _profile["refuel"]
        self.travel_medium = _profile["medium"]

        self.destination = None
        self.all_places: list[Place] = []
        self.scored_places: list[dict] = []
        self.scored_food: list[dict] = []
        self.fuel_places: list[dict] = []
        # Live OSM POIs, fetched on-demand only when there's no synced catalogue.
        self.live_sights: list[dict] = []
        self.live_food: list[dict] = []

    # ── Clamped inputs (validated on every assignment) ──────────────────────
    @property
    def days(self) -> int:
        return self._days

    @days.setter
    def days(self, value) -> None:
        self._days = max(1, min(int(value), 30))

    @property
    def budget(self) -> float:
        return self._budget

    @budget.setter
    def budget(self, value) -> None:
        self._budget = max(0.0, float(value))

    @property
    def people_count(self) -> int:
        return self._people_count

    @people_count.setter
    def people_count(self, value) -> None:
        self._people_count = max(1, int(value))

    # ── Public builder ──────────────────────────────────────────────────────
    async def build(self) -> dict:
        await self._load_data()
        self._score_places()
        self._score_food()
        itinerary = self._build_itinerary()
        budget_plan = self._calculate_budget()
        safety = self._collect_safety_notes()

        plan = {
            "summary": self._make_summary(),
            "destinationId": str(self.destination.id) if self.destination else None,
            "destinationName": self.destination.name if self.destination else self.destination_name,
            "days": self.days,
            "tripType": self.trip_type,
            "travelMode": self.travel_mode,
            "dietPreference": self.diet_preferences,
            "itinerary": itinerary,
            "recommendedPlaces": [p["place"] for p in self.scored_places[:10]],
            "recommendedFood": [f["place"] for f in self.scored_food[:10]],
            # Refuelling only applies to self-driven petrol vehicles (car/motorcycle) —
            # never on a train, flight, ferry, or while walking.
            "fuelStops": self.fuel_places[:10] if self.refuel_relevant else [],
            "estimatedBudget": budget_plan,
            "safetyNotes": safety,
            "offlinePackSuggested": True,
            "generatedAt": utcnow().isoformat(),
        }
        getting_there = await self._plan_getting_there()
        if getting_there:
            plan["gettingThere"] = getting_there
        return plan

    # ── Getting there: the real origin→destination leg ──────────────────────
    async def _plan_getting_there(self) -> dict | None:
        """When the traveller says where they're starting from, compute the actual
        origin→destination leg with their chosen transport: route distance/time, fuel
        stops along the way, and the travel cost. Best-effort and optional — any failure
        (origin not found, or an impossible mode like a 100 km flight) returns a small
        object carrying a `note`, so the destination itinerary is never broken by it."""
        # getattr keeps this safe for callers that build a planner via __new__ (tests).
        if not getattr(self, "origin_name", ""):
            return None

        transport, _ = resolve_transport(self.travel_mode)

        try:
            origin_pt = await geocode_city(self.db, self.origin_name)
            if self.destination and self.destination.latitude is not None and self.destination.longitude is not None:
                dest_pt = {
                    "name": self.destination.name,
                    "latitude": self.destination.latitude,
                    "longitude": self.destination.longitude,
                }
            else:
                dest_pt = await geocode_city(self.db, self.destination_name)
        except GeocodeError as exc:
            return {"originQuery": self.origin_name, "transport": transport, "note": str(exc)}

        origin = _leg_point(origin_pt)
        destination = _leg_point(dest_pt)

        # Honour the same feasibility guard the manual route planner enforces, so we never
        # render a confident ETA for an impossible leg (intercity metro, a too-short flight).
        reason = await check_leg_feasibility(origin, destination, transport)
        if reason:
            return {"origin": origin, "destination": destination, "transport": transport, "note": reason}

        try:
            route = await plan_route(
                self.db, {"legs": [{"origin": origin, "destination": destination, "transport": transport}]}
            )
        except Exception:
            logger.exception("getting-there route computation failed")
            return {"origin": origin, "destination": destination, "transport": transport,
                    "note": "Couldn't compute the route there right now."}

        # The first (only) leg carries any resolved train number/name + scheduled times.
        first_leg = (route.get("legs") or [{}])[0]
        return {
            "origin": origin,
            "destination": destination,
            "transport": transport,
            "distanceKm": route.get("distanceKm"),
            "durationHours": route.get("estimatedDurationHours"),
            "departureTime": route.get("departureTime"),
            "arrivalTime": route.get("arrivalTime"),
            # Along-the-road refuel markers — only meaningful for self-driven petrol modes.
            "fuelStops": route.get("fuelStops", []) if self.refuel_relevant else [],
            "travelCost": leg_cost(transport, route.get("distanceKm", 0.0), self.people_count),
            # Real train identity for a TRAIN leg (None for other modes / no match).
            "trainNumber": first_leg.get("trainNumber"),
            "trainName": first_leg.get("trainName"),
            "scheduledDeparture": first_leg.get("scheduledDeparture"),
            "scheduledArrival": first_leg.get("scheduledArrival"),
            # Real flight identity for a FLIGHT leg (None for other modes / no match).
            "flightNumber": first_leg.get("flightNumber"),
            "airline": first_leg.get("airline"),
            "fromAirport": first_leg.get("fromAirport"),
            "toAirport": first_leg.get("toAirport"),
            "priceText": first_leg.get("priceText"),
            # Full route_planner output, so the card can draw the journey on a real map.
            "route": route,
            "note": leg_warning(origin, destination, transport),
        }

    # ── Step 1: Load data ───────────────────────────────────────────────────
    async def _load_data(self):
        if not self.destination_name or self.db is None:
            return

        result = await self.db.execute(
            select(Destination).where(Destination.name.ilike(f"%{self.destination_name}%"))
        )
        self.destination = result.scalar_one_or_none()

        if self.destination:
            places_result = await self.db.execute(
                select(Place).where(Place.destination_id == self.destination.id)
            )
            self.all_places = places_result.scalars().all()

        # No synced catalogue for this city (unseeded destination, or a destination
        # row with no places) → pull real cafés/restaurants/sights from OpenStreetMap
        # so the itinerary names actual venues instead of generic filler.
        if not self.all_places:
            await self._load_live_places()

    async def _load_live_places(self):
        """Best-effort live OSM fetch around the destination's coordinates."""
        lat = lng = None
        if self.destination and self.destination.latitude is not None:
            lat, lng = self.destination.latitude, self.destination.longitude
        else:
            try:
                pt = await geocode_city(self.db, self.destination_name)
                lat, lng = pt["latitude"], pt["longitude"]
            except GeocodeError:
                return
        if lat is None or lng is None:
            return
        data = await fetch_live_pois(lat, lng)
        self.live_sights = data.get("sights", [])
        self.live_food = data.get("food", [])

    # ── Step 2: Personalized place scoring ──────────────────────────────────
    def _score_places(self):
        for p in self.all_places:
            # Petrol pumps are road-trip utilities, never sightseeing stops.
            if p.type == "FUEL":
                self.fuel_places.append({
                    "id": str(p.id),
                    "name": p.name,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "phone": p.phone,
                    "address": p.address,
                })
                continue
            if p.type in ("RESTAURANT", "CAFE", "EMERGENCY"):
                continue

            style_score = self._style_match(p.type, self.travel_styles)
            rating_confidence = self._rating_confidence(p.external_review_count)
            rating_score = p.external_rating or 0
            tripova = p.tripova_score or 0

            personalized = (
                style_score * 0.40
                + tripova * 0.35
                + rating_score * 0.15
                + rating_confidence * 0.10
            )

            self.scored_places.append({
                "score": round(personalized, 2),
                "style_match": round(style_score, 2),
                "place": {
                    "id": str(p.id),
                    "name": p.name,
                    "type": p.type,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "external_rating": p.external_rating,
                    "tripova_score": p.tripova_score,
                    "phone": p.phone,
                    "address": p.address,
                    "tags": p.tags,
                },
            })

        # Live OSM sights — no ratings to score on, so they sit on a modest baseline
        # nudged by how well their type matches the traveller's styles. getattr keeps
        # this safe for tests that build a planner via __new__ without these fields.
        for s in getattr(self, "live_sights", []):
            style_score = self._style_match(s["type"], self.travel_styles)
            self.scored_places.append({
                "score": round(40 + style_score * 0.5, 2),
                "style_match": round(style_score, 2),
                "place": {
                    "id": s["id"],
                    "name": s["name"],
                    "type": s["type"],
                    "latitude": s["latitude"],
                    "longitude": s["longitude"],
                    "external_rating": None,
                    "tripova_score": None,
                    "phone": s.get("phone"),
                    "address": s.get("address"),
                    "tags": None,
                    "source": "osm",
                },
            })

        self.scored_places.sort(key=lambda x: x["score"], reverse=True)

    # ── Step 3: Diet-aware food scoring ─────────────────────────────────────
    def _score_food(self):
        for p in self.all_places:
            if p.type not in ("RESTAURANT", "CAFE"):
                continue

            diet_tags = p.diet_tags or []
            diet_bonus = 0
            if self.diet_preferences:
                matches = sum(1 for d in self.diet_preferences if d in diet_tags)
                diet_bonus = (matches / len(self.diet_preferences)) * 40

            rating_score = (p.external_rating or 0) * 0.5
            tripova = (p.tripova_score or 0) * 0.5

            final = diet_bonus + rating_score + tripova

            self.scored_food.append({
                "score": round(final, 2),
                "diet_bonus": round(diet_bonus, 2),
                "place": {
                    "id": str(p.id),
                    "name": p.name,
                    "type": p.type,
                    "diet_tags": diet_tags,
                    "external_rating": p.external_rating,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "phone": p.phone,
                    "address": p.address,
                    "price_range": p.price_range,
                },
            })

        # Live OSM cafés/restaurants — score on diet match against the OSM cuisine
        # tag (the only honest signal we have) over a small baseline. getattr keeps
        # this safe for tests that build a planner via __new__ without these fields.
        for f in getattr(self, "live_food", []):
            diet_tags = f.get("diet_tags") or []
            diet_bonus = 0
            if self.diet_preferences:
                matches = sum(1 for d in self.diet_preferences if d in diet_tags)
                diet_bonus = (matches / len(self.diet_preferences)) * 40
            self.scored_food.append({
                "score": round(20 + diet_bonus, 2),
                "diet_bonus": round(diet_bonus, 2),
                "place": {
                    "id": f["id"],
                    "name": f["name"],
                    "type": f["type"],
                    "diet_tags": diet_tags,
                    "external_rating": None,
                    "latitude": f["latitude"],
                    "longitude": f["longitude"],
                    "phone": f.get("phone"),
                    "address": f.get("address"),
                    "price_range": None,
                    # The local speciality, when OSM names a cuisine — shown to travellers.
                    "cuisine": f.get("cuisine"),
                    "source": "osm",
                },
            })

        self.scored_food.sort(key=lambda x: x["score"], reverse=True)

    # ── Step 4: Multi-factor itinerary construction ─────────────────────────
    def _build_itinerary(self) -> list[dict]:
        if not self.scored_places and not self.scored_food:
            return self._empty_itinerary()

        top_places = self.scored_places[:self.days * 2]
        top_food = self.scored_food[:self.days * 2]
        food_iter = cycle(top_food) if top_food else cycle([None])

        archetypes = [DAY_ARCHETYPES[i % len(DAY_ARCHETYPES)] for i in range(self.days)]
        prev_types = set()
        itinerary = []

        place_idx = 0
        for day_num, archetype in enumerate(archetypes, 1):
            day_places = []
            day_foods = []

            # Assign 2 places per day (morning + afternoon), avoid repeating types
            for _ in range(2):
                candidate = self._pick_next_diverse(top_places, place_idx, prev_types)
                if candidate:
                    day_places.append(candidate)
                    place_idx = top_places.index(candidate) + 1
                    prev_types.add(candidate["place"]["type"])

            # Assign 1-2 food spots
            for _ in range(2):
                candidate_food = next(food_iter)
                if candidate_food:
                    day_foods.append(candidate_food)

            # Build archetype-aware slots
            slots = self._build_day_slots(archetype, day_num, day_places, day_foods)
            itinerary.append({
                "day": day_num,
                "archetype": archetype,
                "title": self._day_title(archetype, day_num),
                "slots": slots,
            })

        return itinerary

    def _pick_next_diverse(self, pool: list[dict], start: int, used_types: set) -> dict | None:
        for i in range(start, min(start + 6, len(pool))):
            pt = pool[i]["place"]["type"]
            if pt not in used_types:
                return pool[i]
        for i in range(start, len(pool)):
            return pool[i]
        return None

    @staticmethod
    def _food_label(entry: dict | None) -> str | None:
        """A food spot's display name, with its OSM cuisine (local speciality) appended
        when we have one — e.g. 'Sarafa Bazaar Cafe (South Indian)'."""
        if not entry:
            return None
        place = entry.get("place", {})
        name = place.get("name")
        if not name:
            return None
        cuisine = place.get("cuisine")
        if cuisine:
            pretty = cuisine.replace("_", " ").replace(";", ", ").title()
            return f"{name} ({pretty})"
        return name

    def _build_day_slots(self, archetype: str, day: int, places: list[dict], foods: list[dict]) -> dict:
        slots = {}

        # Morning — gentle start
        morning_name = places[0]["place"]["name"] if len(places) > 0 else f"Explore {self.destination_name}"
        slots["morning"] = {
            "activity": f"Breakfast + {morning_name}",
            "place_type": places[0]["place"]["type"] if places else "explore",
            "food_match": self._food_label(foods[0]) if foods and foods[0] else "Local café",
            "budget_share": "25%",
        }

        # Afternoon — main activity
        if len(places) > 1:
            p2 = places[1]
            slots["afternoon"] = {
                "activity": p2["place"]["name"],
                "place_type": p2["place"]["type"],
                "personalized_score": p2["score"],
                "budget_share": "40%",
            }
        else:
            slots["afternoon"] = {
                "activity": f"{archetype.replace('_', ' ').title()} in {self.destination_name or 'the area'}",
                "place_type": "explore",
                "budget_share": "40%",
            }

        # Evening — food + wind down
        evening_food = self._food_label(foods[-1]) if foods and foods[-1] else "Local dining"
        slots["evening"] = {
            "activity": f"Dinner at {evening_food}",
            "food_match": evening_food,
            "budget_share": "35%",
        }

        return slots

    def _day_title(self, archetype: str, day: int) -> str:
        titles = {
            "arrival": "Arrival & First Impressions",
            "exploration": "Deep Exploration",
            "deep_dive": "Hidden Gems",
            "adventure": "Adventure Day",
            "relaxation": "Leisure & Reflection",
            "departure": "Farewell",
        }
        return titles.get(archetype, f"Day {day}")

    def _empty_itinerary(self) -> list[dict]:
        return [
            {
                "day": d,
                "archetype": "exploration",
                "title": f"Day {d}",
                "slots": {
                    "morning": {"activity": f"Explore {self.destination_name}", "budget_share": "30%"},
                    "afternoon": {"activity": f"Continue exploring", "budget_share": "40%"},
                    "evening": {"activity": "Dinner & rest", "budget_share": "30%"},
                },
            }
            for d in range(1, self.days + 1)
        ]

    # ── Step 5: Budget allocation ───────────────────────────────────────────
    def _calculate_budget(self) -> dict:
        total = self.budget
        per_person = total / self.people_count if self.people_count else total
        per_day = total / self.days if self.days else total

        # Adjust ratios by trip type
        if self.trip_type == "SOLO":
            ratios = {"accommodation": 0.30, "food": 0.20, "activities": 0.35, "transport": 0.15}
        elif self.trip_type == "FAMILY":
            ratios = {"accommodation": 0.40, "food": 0.20, "activities": 0.25, "transport": 0.15}
        elif self.trip_type == "FRIENDS":
            ratios = {"accommodation": 0.25, "food": 0.25, "activities": 0.30, "transport": 0.20}
        elif self.trip_type == "COUPLE":
            ratios = {"accommodation": 0.35, "food": 0.20, "activities": 0.30, "transport": 0.15}
        else:
            ratios = {"accommodation": 0.30, "food": 0.25, "activities": 0.30, "transport": 0.15}

        return {
            "total": total,
            "per_person": per_person,
            "per_day": per_day,
            "currency": "INR",
            "breakdown": {k: round(total * v, 2) for k, v in ratios.items()},
            "ratios": ratios,
        }

    # ── Step 6: Safety ──────────────────────────────────────────────────────
    def _collect_safety_notes(self) -> list[str]:
        notes = []
        if self.destination and self.destination.safety_summary:
            notes.append(self.destination.safety_summary)
        if self.trip_type == "SOLO":
            notes.append("Share your itinerary with someone you trust. Check in daily.")
        if self.destination and self.destination.internet_quality:
            notes.append(f"Internet: {self.destination.internet_quality}")
        return notes

    # ── Summary ─────────────────────────────────────────────────────────────
    def _make_summary(self) -> str:
        dest = self.destination.name if self.destination else self.destination_name
        styles = ", ".join(self.travel_styles) if self.travel_styles else "balanced"
        diets = ", ".join(self.diet_preferences) if self.diet_preferences else "no restrictions"
        people = "solo" if self.people_count == 1 else f"{self.people_count} people"
        return (
            f"A {self.days}-day {self.trip_type.lower()} trip to {dest} for {people}. "
            f"Style: {styles}. Diet: {diets}. "
            f"Personalized itinerary with {len(self.scored_places)} attractions "
            f"and {len(self.scored_food)} food spots."
        )

    # ── Helpers ─────────────────────────────────────────────────────────────
    @staticmethod
    def _style_match(place_type: str, styles: list[str]) -> float:
        if not styles:
            return 60.0
        matched = 0
        for s in styles:
            s_clean = s.lower().strip()
            matching_types = STYLE_TYPE_MAP.get(s_clean, set())
            if place_type in matching_types:
                matched += 1
        return min(100, (matched / len(styles)) * 100)

    @staticmethod
    def _rating_confidence(review_count: int | None) -> float:
        if not review_count or review_count <= 0:
            return 0
        return min(100, log10(review_count + 1) / log10(10000) * 100)
