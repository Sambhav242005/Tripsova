import re
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.data_sources.normalizer import deduplicate_places, merge_place_sources
from app.modules.data_sources.osm_provider import OpenStreetMapProvider
from app.modules.data_sources.wikivoyage_provider import WikivoyageProvider
from app.modules.data_sources.wikidata_provider import WikidataProvider
from app.modules.data_sources.google_places_provider import GooglePlacesProvider
from app.modules.data_sources.reddit_deep_review_provider import RedditDeepReviewProvider
from app.modules.data_sources.weather_provider import WeatherProvider
from app.shared.diet import to_canonical
from app.shared.errors import NotFoundError
from app.shared.utils import slugify
import uuid as _uuid


def _place_slug(name: str) -> str:
    """Unique slug for an ingested place (slug column is NOT NULL)."""
    return f"{slugify(name) or 'place'}-{_uuid.uuid4().hex[:8]}"


def _to_uuid(value: str, label: str) -> _uuid.UUID:
    """Coerce a path-param string to UUID; a malformed id can never match a row."""
    try:
        return _uuid.UUID(str(value))
    except ValueError:
        raise NotFoundError(f"{label} not found")


async def sync_destination(db: AsyncSession, destination_id: str) -> dict:
    result = await db.execute(select(Destination).where(Destination.id == _to_uuid(destination_id, "Destination")))
    destination = result.scalar_one_or_none()
    if not destination:
        raise NotFoundError("Destination not found")

    wikivoyage = WikivoyageProvider()
    wikidata = WikidataProvider()

    voy_data = await wikivoyage.get_destination_info(db, destination.name)
    wd_data = await wikidata.get_destination_info(db, destination.name)

    if voy_data.get("description") and not destination.description:
        destination.description = voy_data["description"]
    if wd_data.get("description") and not destination.description:
        destination.description = wd_data["description"]
    if not destination.latitude and wd_data.get("lat"):
        destination.latitude = wd_data["lat"]
        destination.longitude = wd_data["lng"]

    await db.flush()
    return {
        "destination_id": destination_id,
        "description_updated": bool(voy_data.get("description") or wd_data.get("description")),
        "coords_updated": bool(wd_data.get("lat")),
        "sources": ["wikivoyage" if voy_data else None, "wikidata" if wd_data else None],
    }


async def sync_places(db: AsyncSession, destination_id: str) -> dict:
    result = await db.execute(select(Destination).where(Destination.id == _to_uuid(destination_id, "Destination")))
    destination = result.scalar_one_or_none()
    if not destination:
        raise NotFoundError("Destination not found")

    osm = OpenStreetMapProvider()
    wikidata = WikidataProvider()
    google = GooglePlacesProvider()

    providers = [osm, wikidata, google]
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for provider in providers:
        try:
            results = await provider.search_places(
                db, destination.name, destination.latitude, destination.longitude
            )
        except Exception:
            continue

        for place_data in results:
            existing, is_duplicate = await deduplicate_places(
                db,
                name=place_data.get("name", ""),
                lat=place_data.get("lat"),
                lng=place_data.get("lng"),
                source_name=provider.name,
            )

            if is_duplicate and existing:
                await merge_place_sources(db, existing, place_data)
                updated_count += 1
            elif not is_duplicate and place_data.get("name"):
                from app.modules.places.models import PlaceSource

                place = Place(
                    name=place_data["name"],
                    slug=_place_slug(place_data["name"]),
                    destination_id=destination.id,
                    latitude=place_data.get("lat"),
                    longitude=place_data.get("lng"),
                    external_rating=place_data.get("rating"),
                    external_review_count=place_data.get("review_count"),
                    source=provider.name,
                    source_place_id=place_data.get("source_id"),
                    type=place_data.get("type", "TOURIST_SPOT"),
                )
                db.add(place)
                created_count += 1
            else:
                skipped_count += 1

    await db.flush()
    return {
        "destination_id": destination_id,
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }


async def sync_fuel_stations(db: AsyncSession, destination_id: str, radius_m: int = 15000) -> dict:
    """Ingest petrol pumps around a destination from OpenStreetMap (Overpass, amenity=fuel)."""
    result = await db.execute(select(Destination).where(Destination.id == _to_uuid(destination_id, "Destination")))
    destination = result.scalar_one_or_none()
    if not destination:
        raise NotFoundError("Destination not found")
    if destination.latitude is None or destination.longitude is None:
        raise NotFoundError("Destination has no coordinates to search around")

    from app.modules.maps.osm import osm_provider

    query = (
        f"[out:json][timeout:25];"
        f'node["amenity"="fuel"](around:{radius_m},{destination.latitude},{destination.longitude});'
        f"out body 100;"
    )
    elements = await osm_provider.query_overpass(query)

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for element in elements:
        tags = element.get("tags", {}) or {}
        name = tags.get("name") or tags.get("brand") or "Petrol Pump"
        lat = element.get("lat")
        lng = element.get("lon")
        if lat is None or lng is None:
            skipped_count += 1
            continue

        existing, is_duplicate = await deduplicate_places(
            db, name=name, lat=lat, lng=lng, source_name="openstreetmap"
        )
        if is_duplicate and existing:
            updated_count += 1
            continue

        db.add(
            Place(
                name=name,
                slug=_place_slug(name),
                destination_id=destination.id,
                latitude=lat,
                longitude=lng,
                type="FUEL",
                source="openstreetmap",
                source_place_id=f"osm-node-{element.get('id')}",
                phone=tags.get("phone"),
                address=tags.get("addr:full") or tags.get("addr:street"),
            )
        )
        created_count += 1

    await db.flush()
    return {
        "destination_id": destination_id,
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }


# OSM amenity -> our Place.type. Restaurants, fast food and food courts are all
# "RESTAURANT"; cafes are their own bucket so PureFind can show both honestly.
_FOOD_AMENITY_TYPE = {
    "restaurant": "RESTAURANT",
    "fast_food": "RESTAURANT",
    "food_court": "RESTAURANT",
    "cafe": "CAFE",
}


def _osm_diet_tags(tags: dict) -> list[str]:
    """Map OpenStreetMap diet:* / cuisine tags to our diet tag vocabulary.

    Most OSM restaurant nodes carry no diet:* tags at all, so we also infer a
    diet hint from the cuisine tag and the venue name — Indian eateries very
    commonly signal it there ("Pure Veg", "Shudh Shakahari", "Jain Bhojnalay").
    These are unverified hints; community verification still upgrades a place to
    diet-trusted.
    """
    diet: list[str] = []
    osm_diet = {
        "diet:vegetarian": "vegetarian",
        "diet:vegan": "vegan",
        "diet:jain": "jain",
        "diet:halal": "halal",
        "diet:kosher": "kosher",
        "diet:gluten_free": "gluten-free",
    }
    for key, label in osm_diet.items():
        if str(tags.get(key, "")).lower() in ("yes", "only", "limited"):
            diet.append(label)

    text = f"{tags.get('cuisine', '')} {tags.get('name', '')}".lower()

    def _add(label: str) -> None:
        if label not in diet:
            diet.append(label)

    if "jain" in text:
        _add("jain")
    # "Pure veg", "shudh"/"shuddh" (Hindi: pure), "shakahari" (Hindi: vegetarian),
    # or an explicit vegetarian cuisine all imply a vegetarian kitchen.
    if any(kw in text for kw in ("vegetarian", "pure veg", "shudh", "shuddh", "shakahari", "veg only")):
        _add("vegetarian")
    if "vegan" in text:
        _add("vegan")
    if "halal" in text:
        _add("halal")

    # Canonicalise to the stored vocabulary the filters match against (e.g.
    # "vegetarian" -> "PURE_VEG"); drop anything unrecognised, de-dupe in order.
    canonical: list[str] = []
    for label in diet:
        c = to_canonical(label)
        if c and c not in canonical:
            canonical.append(c)
    return canonical


# RESTAURANT/CAFE -> a human label used as a last-resort tag, so no card is ever bare.
_PLACE_TYPE_LABEL = {"RESTAURANT": "Restaurant", "CAFE": "Cafe"}

# Areas currently being enriched (rounded "lat,lng" keys). The UI fires discover on every
# filter/search change, so several land at once; this keeps one enrich per area in flight,
# avoiding duplicate LLM calls and SQLite write contention.
_enrich_inflight: set[str] = set()


def _cuisine_or_type_tags(cuisine: Optional[str], place_type: str) -> list[str]:
    """Descriptive (non-diet) tags for a place: its OSM cuisines, else its type label.

    Guarantees a non-empty list so every food place shows at least one neutral tag even
    when we know nothing about its diet.
    """
    if cuisine:
        parts = [c.strip() for c in cuisine.split(";") if c.strip()]
        if parts:
            return parts
    return [_PLACE_TYPE_LABEL.get(place_type, "Food")]


def _osm_address(tags: dict) -> Optional[str]:
    """Build a human-readable address from whatever OSM addr:* tags the node carries.

    Many POI nodes only have a coarse locality (neighbourhood/suburb) and no street, so
    we accept any combination rather than requiring a street. Returns None when the node
    has no usable address tags at all — the caller backfills those via reverse geocoding.
    """
    if tags.get("addr:full"):
        return tags["addr:full"]
    # Most-specific → least-specific. We never invent any of these; they're verbatim OSM.
    ordered = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:neighbourhood"),
        tags.get("addr:suburb"),
        tags.get("addr:quarter"),
        tags.get("addr:city")
        or tags.get("addr:town")
        or tags.get("addr:village"),
    ]
    parts = [p for p in ordered if p]
    return ", ".join(parts) or None


async def sync_food_places(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_m: int = 5000,
    destination_id: Optional[str] = None,
    limit: int = 120,
) -> dict:
    """Ingest real restaurants/cafes around a point from OpenStreetMap (Overpass).

    Works around any coordinate — the user's approximate location (city they live
    in) or a trip destination's coordinates. Rows are de-duplicated against what we
    already have, so it augments rather than replaces existing data.
    """
    from app.modules.maps.osm import osm_provider

    dest_uuid = _to_uuid(destination_id, "Destination") if destination_id else None

    query = (
        f"[out:json][timeout:25];"
        f"("
        f'node["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:{radius_m},{lat},{lng});'
        f'way["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:{radius_m},{lat},{lng});'
        f");"
        f"out center {int(limit)};"
    )
    elements = await osm_provider.query_overpass(query)

    created_count = 0
    updated_count = 0
    skipped_count = 0

    # Collect the genuinely-new places first, so we can batch the (optional) AI diet
    # inference into a single call rather than one request per place.
    new_places: list[dict] = []

    for element in elements:
        tags = element.get("tags", {}) or {}
        name = tags.get("name")
        place_type = _FOOD_AMENITY_TYPE.get(tags.get("amenity", ""))
        if not name or not place_type:
            skipped_count += 1
            continue

        center = element.get("center") or {}
        p_lat = element.get("lat", center.get("lat"))
        p_lng = element.get("lon", center.get("lon"))
        if p_lat is None or p_lng is None:
            skipped_count += 1
            continue

        existing, is_duplicate = await deduplicate_places(
            db, name=name, lat=p_lat, lng=p_lng, source_name="openstreetmap"
        )
        if is_duplicate and existing:
            updated_count += 1
            continue

        cuisine = tags.get("cuisine")
        new_places.append({
            "name": name,
            "place_type": place_type,
            "lat": p_lat,
            "lng": p_lng,
            "cuisine": cuisine,
            "diet": _osm_diet_tags(tags),  # canonical OSM/name-derived diet hints
            "tags": _cuisine_or_type_tags(cuisine, place_type),
            "opening_hours": tags.get("opening_hours"),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "website": tags.get("website") or tags.get("contact:website"),
            "address": _osm_address(tags),
            "osm_id": f"osm-{element.get('type', 'node')}-{element.get('id')}",
        })

    # Insert immediately with only OSM/name-derived diet hints (instant, no network) so the
    # discover response is fast. AI diet inference and address reverse-geocoding for the
    # places OSM couldn't classify happen afterwards in enrich_food_places (background).
    # diet_tags left NULL means "not yet diet-checked"; an empty list means "checked, none".
    for p in new_places:
        db.add(
            Place(
                name=p["name"],
                slug=_place_slug(p["name"]),
                destination_id=dest_uuid,
                latitude=p["lat"],
                longitude=p["lng"],
                type=p["place_type"],
                diet_tags=p["diet"] or None,
                tags=p["tags"],
                opening_hours={"raw": p["opening_hours"]} if p["opening_hours"] else None,
                phone=p["phone"],
                website=p["website"],
                address=p["address"],
                source="openstreetmap",
                source_place_id=p["osm_id"],
            )
        )
        created_count += 1

    await db.flush()
    return {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "destination_id": destination_id,
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }


async def sync_food_places_from_google(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_m: int = 5000,
    destination_id: Optional[str] = None,
    limit: int = 60,
) -> dict:
    """Fallback food source: Google Places API when OSM returns too few results.

    Searches for restaurants and cafes near the given coordinates via the Google
    Places textsearch endpoint, then creates Place records from the results. Safe
    to call even when GOOGLE_PLACES_API_KEY is unset — provider returns [].
    """
    google = GooglePlacesProvider()
    dest_uuid = _to_uuid(destination_id, "Destination") if destination_id else None

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for query in ("restaurants", "cafes"):
        results = await google.search_places(
            db, query=query, lat=lat, lng=lng, radius=radius_m / 1000.0,
        )
        if not results:
            continue

        for item in results:
            p_lat = item.get("lat")
            p_lng = item.get("lng")
            name = item.get("name", "")
            if not name or p_lat is None or p_lng is None:
                skipped_count += 1
                continue

            existing, is_duplicate = await deduplicate_places(
                db, name=name, lat=p_lat, lng=p_lng, source_name="google_places"
            )
            if is_duplicate and existing:
                await merge_place_sources(db, existing, item)
                updated_count += 1
                continue

            types = item.get("types", [])
            place_type = "CAFE" if "cafe" in types else "RESTAURANT"

            db.add(
                Place(
                    name=name,
                    slug=_place_slug(name),
                    destination_id=dest_uuid,
                    latitude=p_lat,
                    longitude=p_lng,
                    type=place_type,
                    tags=_cuisine_or_type_tags(None, place_type),
                    address=item.get("full_address"),
                    external_rating=item.get("rating"),
                    external_review_count=item.get("review_count"),
                    source="google_places",
                    source_place_id=item.get("source_id"),
                    photos=item.get("photos"),
                )
            )
            created_count += 1
            if created_count >= limit:
                break

        if created_count >= limit:
            break

    await db.flush()
    return {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "destination_id": destination_id,
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }


async def enrich_food_places(
    lat: float,
    lng: float,
    radius_km: float,
    limit: int = 40,
) -> int:
    """Backfill diet tags and addresses for nearby food places, closest-first.

    Runs as a background task after a discover call, so neither the (slow) AI diet
    inference nor the throttled reverse geocoding ever blocks the response. Both steps are
    bounded so a place is enriched at most once:

      * diet_tags NULL  → AI infers a diet (real LLM call, no fabrication); the result —
        even an empty list — is written back, so NULL→list/[] means "checked".
      * address  NULL   → OpenStreetMap's Nominatim reverse endpoint (real OSM data),
        throttled to ~1 req/sec per its usage policy; "" marks "checked, none found".

    The DB connection is held only for the brief read and write phases — never across the
    AI call or the throttled reverse-geocode loop — so concurrent enrich tasks (the UI
    fires discover on every filter/search change) can't exhaust the connection pool.

    Returns how many rows were changed.
    """
    import asyncio

    from app.database import async_session_factory
    from app.modules.food.diet_ai import ai_infer_diet_tags
    from app.modules.food.service import _haversine_km
    from app.modules.trips.geocode import reverse_geocode

    # Coalesce the burst of discovers for the same area into a single enrich pass.
    area_key = f"{round(lat, 3)},{round(lng, 3)},{round(radius_km, 1)}"
    if area_key in _enrich_inflight:
        return 0
    _enrich_inflight.add(area_key)
    try:
        return await _enrich_food_places_inner(
            lat, lng, radius_km, limit,
            async_session_factory, ai_infer_diet_tags, _haversine_km, reverse_geocode, asyncio,
        )
    finally:
        _enrich_inflight.discard(area_key)


async def _enrich_food_places_inner(
    lat, lng, radius_km, limit,
    async_session_factory, ai_infer_diet_tags, _haversine_km, reverse_geocode, asyncio,
) -> int:
    # --- Read phase: collect plain (id, name, tags, coords) tuples, then release the conn.
    async with async_session_factory() as db:
        result = await db.execute(
            select(
                Place.id, Place.name, Place.tags, Place.latitude, Place.longitude,
                Place.diet_tags, Place.address,
            ).where(
                Place.type.in_(["RESTAURANT", "CAFE"]),
                Place.latitude.is_not(None),
                Place.longitude.is_not(None),
            )
        )
        rows = result.all()

    nearby = sorted(
        ((r, _haversine_km(lat, lng, r.latitude, r.longitude)) for r in rows),
        key=lambda rd: rd[1],
    )
    nearby = [r for r, dist in nearby if dist <= radius_km]

    # --- Slow phase: no DB connection held while we call the LLM / reverse geocoder.
    updates: dict = {}  # place_id -> {"diet_tags"?: list, "address"?: str}

    needs_diet = [r for r in nearby if r.diet_tags is None][:limit]
    if needs_diet:
        inferred = await ai_infer_diet_tags(
            [{"name": r.name, "cuisine": ", ".join(r.tags or [])} for r in needs_diet]
        )
        for r, diet in zip(needs_diet, inferred):
            updates.setdefault(r.id, {})["diet_tags"] = diet or []  # [] = checked, none

    needs_addr = [r for r in nearby if r.address is None][:limit]
    for r in needs_addr:
        address = await reverse_geocode(r.latitude, r.longitude)
        updates.setdefault(r.id, {})["address"] = address or ""  # "" = checked, none found
        await asyncio.sleep(1)  # honour Nominatim's ~1 req/sec policy (background — free)

    if not updates:
        return 0

    # --- Write phase: reopen a session just long enough to persist the results.
    async with async_session_factory() as db:
        result = await db.execute(select(Place).where(Place.id.in_(list(updates.keys()))))
        for place in result.scalars().all():
            for field, value in updates[place.id].items():
                setattr(place, field, value)
        await db.commit()
    return len(updates)


async def enrich_place(db: AsyncSession, place_id: str) -> dict:
    result = await db.execute(select(Place).where(Place.id == _to_uuid(place_id, "Place")))
    place = result.scalar_one_or_none()
    if not place:
        raise NotFoundError("Place not found")

    google = GooglePlacesProvider()
    osm = OpenStreetMapProvider()
    wikidata = WikidataProvider()

    enriched_fields = []

    google_data = await google.get_place_details(db, str(place.id))
    if google_data:
        await merge_place_sources(db, place, google_data)
        enriched_fields.append("google")

    osm_data = await osm.get_place_details(db, str(place.id))
    if osm_data:
        await merge_place_sources(db, place, osm_data)
        enriched_fields.append("osm")

    wd_data = await wikidata.get_place_details(db, str(place.id))
    if wd_data:
        await merge_place_sources(db, place, wd_data)
        enriched_fields.append("wikidata")

    from app.modules.places.ranking import calculate_tripova_score

    score_data = await calculate_tripova_score(db, place)
    place.tripova_score = score_data["finalScore"]
    enriched_fields.append("score")

    await db.flush()
    return {
        "place_id": place_id,
        "enriched_fields": enriched_fields,
        "tripova_score": place.tripova_score,
    }


async def deep_review(db: AsyncSession, request: dict) -> dict:
    place_id = request.get("placeId")
    place_name = request.get("placeName", "")
    # Both sources default ON: this endpoint is "deep check", so we search the open
    # web *and* Reddit unless a caller explicitly opts a source out.
    include_reddit = request.get("includeReddit", True)
    include_web = request.get("includeWeb", True)
    user_question = request.get("userQuestion", "")

    place = None
    if place_id:
        result = await db.execute(select(Place).where(Place.id == place_id))
        place = result.scalar_one_or_none()

    if place:
        place_name = place.name

    review_data = {"sources": [], "positive": [], "negative": [], "complaints": [], "safety": [], "food": [], "crowd": [], "top_reviews": []}

    def _merge(part: dict) -> None:
        for key in review_data:
            review_data[key].extend(part.get(key, []))

    destination_name = request.get("destinationName")

    if include_reddit:
        reddit = RedditDeepReviewProvider()
        try:
            # Prefer the top 100 Reddit hits (by score); the provider falls back to
            # fewer if Reddit returns less. Aggregation uses all of them.
            _merge(await reddit.search_reviews(place_name, destination_name=destination_name, limit=100))
        except Exception:
            pass

    if include_web:
        from app.modules.data_sources.web_deep_review_provider import WebDeepReviewProvider

        web = WebDeepReviewProvider()
        try:
            _merge(await web.search_reviews(place_name, destination_name=destination_name, limit=12))
        except Exception:
            pass

    # De-duplicate merged signals/reviews (the two providers can surface the same
    # link or phrasing), preserving the score-ordered, Reddit-first sequence.
    for key in ("positive", "negative", "complaints", "safety", "food", "crowd"):
        review_data[key] = list(dict.fromkeys(review_data[key]))
    _seen_reviews: set = set()
    _deduped_reviews: list = []
    for rev in review_data["top_reviews"]:
        rk = ((rev.get("url") or ""), re.sub(r"\s+", " ", (rev.get("title") or "").strip().lower()))
        if rk in _seen_reviews:
            continue
        _seen_reviews.add(rk)
        _deduped_reviews.append(rev)
    review_data["top_reviews"] = _deduped_reviews

    weather = {}
    if place:
        weather_provider = WeatherProvider()
        try:
            weather = await weather_provider.get_weather(lat=place.latitude, lng=place.longitude)
        except Exception:
            pass

    score_data = {}
    if place:
        from app.modules.places.ranking import calculate_tripova_score

        score_data = await calculate_tripova_score(db, place)

    sources = review_data.get("sources", [])
    if weather:
        sources.append({"name": "weather", "data": True})

    positive = review_data.get("positive", [])
    negative = review_data.get("negative", [])
    repeated_complaints = review_data.get("complaints", [])
    safety_warnings = review_data.get("safety", [])
    food_warnings = review_data.get("food", [])
    crowd_warnings = review_data.get("crowd", [])

    if user_question and "jain" in user_question.lower():
        food_warnings.append("No strong Jain food verification found")
    if user_question and "solo female" in user_question.lower():
        safety_warnings.append("Verify recent solo female traveller reports before visiting")

    vader_scores = []
    for r in sources:
        score_val = r.get("sentiment_score")
        if score_val is not None:
            vader_scores.append(score_val)
    from app.shared.sentiment import aggregate_sentiment
    agg = aggregate_sentiment(vader_scores)
    sentiment_score = agg["score"]
    sentiment_magnitude = agg["magnitude"]

    if sentiment_score >= 65:
        sentiment = "POSITIVE"
    elif sentiment_score <= 35:
        sentiment = "NEGATIVE"
    elif len(vader_scores) > 0:
        sentiment = "MIXED"
    else:
        sentiment = "UNKNOWN"

    confidence = 50
    source_count = len(review_data.get("sources", []))
    if source_count:
        confidence += min(25, source_count * 4)
    if place and place.external_review_count and place.external_review_count > 100:
        confidence += 15
    if place and place.tripova_score and place.tripova_score > 50:
        confidence += 15
    if user_question:
        confidence += 5

    overall_parts = []
    if sentiment == "POSITIVE":
        overall_parts.append("Recent traveller discussions are generally positive.")
    elif sentiment == "NEGATIVE":
        overall_parts.append("Recent traveller discussions show several concerns.")
    elif sentiment == "MIXED":
        overall_parts.append("Recent traveller discussions are mixed.")
    else:
        overall_parts.append("Limited traveller discussion data available.")

    if positive:
        overall_parts.append(f"People like: {', '.join(positive[:3])}.")
    if negative:
        overall_parts.append(f"Concerns include: {', '.join(negative[:3])}.")
    if repeated_complaints:
        overall_parts.append(f"Repeated complaints: {', '.join(repeated_complaints[:2])}.")
    if user_question:
        overall_parts.append(f"Regarding your question: '{user_question}' — verification is recommended.")

    return {
        "overallSummary": " ".join(overall_parts),
        "positiveSignals": positive,
        "negativeSignals": negative,
        "repeatedComplaints": repeated_complaints,
        "safetyWarnings": safety_warnings,
        "foodWarnings": food_warnings,
        "crowdWarnings": crowd_warnings,
        "sentiment": sentiment,
        "sentimentScore": round(sentiment_score, 1),
        "sentimentMagnitude": round(sentiment_magnitude, 1),
        "confidenceScore": min(confidence, 100),
        "sourcesUsed": sources,
        "topReviews": review_data.get("top_reviews", [])[:12],
        "lastCheckedAt": datetime.now(timezone.utc).isoformat(),
    }
