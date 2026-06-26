"""
Tripsova Journey Planner — the "smart" layer over the route calculator.

The route_planner is a *calculator*: you hand it legs that already name a transport.
The journey_planner is the *decision-maker*: the user gives only

    origin city, destination city, round trip?, people, (optional) budget/departure

and this module:
  1. geocodes both cities (DB first, else OpenStreetMap),
  2. chooses the transport(s) from distance/geography — a single best mode for short and
     medium hops, or an automatic drive→fly→drive chain through the nearest airports for
     long ones,
  3. mirrors the legs for a round trip,
  4. delegates to route_planner.plan_route for all timing / segments / stops, then
  5. estimates the cost per leg and overall (and flags it against the budget).

Everything about "how to travel" is derived here; the caller never picks a mode.
"""

import asyncio
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trips.geocode import geocode_city
from app.modules.trips.hubs import nearest_airport, nearest_station
from app.modules.trips.route_planner import haversine_km, plan_route
from app.modules.trips.transport import leg_cost

logger = logging.getLogger("tripsova.journey")

# Distance thresholds (straight-line km) for picking a mode.
SHORT_KM = 250.0    # at or below → drive
MEDIUM_KM = 700.0   # at or below → train; above → fly (multi-leg via airports)
# If a city is this close to its hub, skip the short "get to the hub" leg — it's just
# an intra-city taxi/auto ride and only clutters the journey. Most main railway stations
# sit inside the city, so train access legs almost always fall away here; airports sit
# further out, so the drive-to-airport leg usually survives.
HUB_SKIP_KM = 25.0


def _pt(d: dict) -> dict:
    """Strip a geocode/hub result down to the {name, latitude, longitude} a leg needs."""
    return {"name": d["name"], "latitude": d["latitude"], "longitude": d["longitude"]}


async def _via_hub_legs(o: dict, d: dict, hub_transport: str, nearest) -> Optional[list[dict]]:
    """Build a 'get to hub → ride → get in from hub' chain for FLIGHT or TRAIN.

    Snaps both ends to their nearest real hub (airport / station). A trivially short
    access leg (within HUB_SKIP_KM) is dropped. Returns None when there's no usable pair
    of distinct hubs, so the caller can fall back to a direct ground leg.
    """
    oh, dh = await asyncio.gather(nearest(o), nearest(d))
    if not oh or not dh or oh["name"] == dh["name"]:
        return None
    oh_pt, dh_pt = _pt(oh), _pt(dh)
    legs: list[dict] = []
    if oh["distanceKm"] > HUB_SKIP_KM:
        legs.append({"origin": o, "destination": oh_pt, "transport": "CAR"})
    legs.append({"origin": oh_pt, "destination": dh_pt, "transport": hub_transport})
    if dh["distanceKm"] > HUB_SKIP_KM:
        legs.append({"origin": dh_pt, "destination": d, "transport": "CAR"})
    return legs


async def choose_legs(origin: dict, destination: dict) -> list[dict]:
    """Decide the leg(s) and their transport between two coordinate points.

    Returns a list of {origin, destination, transport}:
      - Short (≤ SHORT_KM) → a single CAR leg.
      - Medium (≤ MEDIUM_KM) → TRAIN, routed station→station through the nearest real
        railway stations (with a drive-in leg only if a station is unusually far).
      - Long → drive→FLIGHT→drive through the nearest real airports; if flying is
        pointless (no airports, or both ends share one) it falls back to the train.
    """
    o, d = _pt(origin), _pt(destination)
    straight = haversine_km(o["latitude"], o["longitude"], d["latitude"], d["longitude"])

    if straight <= SHORT_KM:
        return [{"origin": o, "destination": d, "transport": "CAR"}]

    if straight <= MEDIUM_KM:
        # Take the train — but from the real station, not the city centre.
        via_station = await _via_hub_legs(o, d, "TRAIN", nearest_station)
        return via_station or [{"origin": o, "destination": d, "transport": "TRAIN"}]

    # Long haul → fly through airports; if that's not viable, fall back to the train
    # (still routed through real stations).
    via_air = await _via_hub_legs(o, d, "FLIGHT", nearest_airport)
    if via_air:
        return via_air
    via_station = await _via_hub_legs(o, d, "TRAIN", nearest_station)
    return via_station or [{"origin": o, "destination": d, "transport": "TRAIN"}]


def _reverse_legs(legs: list[dict]) -> list[dict]:
    """Mirror legs for the return journey: reverse order, swap each leg's endpoints."""
    return [
        {"origin": leg["destination"], "destination": leg["origin"], "transport": leg["transport"]}
        for leg in reversed(legs)
    ]


def _cost_breakdown(route: dict, people: int) -> dict:
    """Per-leg + total INR estimate, computed from the distances route_planner returned."""
    per_leg = []
    total = 0.0
    for leg in route.get("legs", []):
        c = leg_cost(leg["transport"], leg.get("distanceKm", 0.0), people)
        per_leg.append({
            "transport": leg["transport"],
            "label": leg.get("label"),
            "from": (leg.get("from") or {}).get("name"),
            "to": (leg.get("to") or {}).get("name"),
            "distanceKm": leg.get("distanceKm"),
            "estimatedCost": c,
        })
        total += c
    return {
        "currency": "INR",
        "people": people,
        "perLeg": per_leg,
        "total": round(total, 2),
        "perPerson": round(total / max(1, people), 2),
    }


async def plan_journey(db: Optional[AsyncSession], data: dict) -> dict:
    """Plan a whole journey from city names alone. See module docstring for the contract."""
    origin_name = (data.get("origin") or "").strip()
    destination_name = (data.get("destination") or "").strip()
    if not origin_name or not destination_name:
        raise ValueError("Both 'origin' and 'destination' city names are required.")

    people = max(1, int(data.get("peopleCount") or 1))
    round_trip = bool(data.get("roundTrip"))
    budget = data.get("budget")

    origin_pt = await geocode_city(db, origin_name)
    destination_pt = await geocode_city(db, destination_name)

    outbound = await choose_legs(origin_pt, destination_pt)
    legs = outbound + _reverse_legs(outbound) if round_trip else outbound

    route = await plan_route(db, {"legs": legs, "departureTime": data.get("departureTime")})

    cost = _cost_breakdown(route, people)
    chosen_modes = []
    for leg in route.get("legs", []):
        if leg["transport"] not in chosen_modes:
            chosen_modes.append(leg["transport"])

    within_budget = None
    if budget is not None:
        within_budget = cost["total"] <= float(budget)

    return {
        "origin": _pt(origin_pt),
        "destination": _pt(destination_pt),
        "roundTrip": round_trip,
        "peopleCount": people,
        "chosenModes": chosen_modes,
        "geocoding": {
            "origin": {"resolvedName": origin_pt["name"], "source": origin_pt["source"]},
            "destination": {"resolvedName": destination_pt["name"], "source": destination_pt["source"]},
        },
        "cost": cost,
        "budget": budget,
        "withinBudget": within_budget,
        "route": route,
    }
