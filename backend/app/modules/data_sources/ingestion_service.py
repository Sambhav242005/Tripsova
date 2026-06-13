from datetime import datetime, timezone

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
    include_reddit = request.get("includeReddit", False)
    user_question = request.get("userQuestion", "")

    place = None
    if place_id:
        result = await db.execute(select(Place).where(Place.id == place_id))
        place = result.scalar_one_or_none()

    if place:
        place_name = place.name

    review_data = {"sources": [], "positive": [], "negative": [], "complaints": [], "safety": [], "food": [], "crowd": []}

    if include_reddit:
        reddit = RedditDeepReviewProvider()
        try:
            reddit_results = await reddit.search_reviews(place_name)
            review_data = reddit_results
        except Exception:
            pass

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
    if include_reddit:
        confidence += 20
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
        "lastCheckedAt": datetime.now(timezone.utc).isoformat(),
    }
