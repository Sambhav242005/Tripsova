import logging
import math
import uuid

from sqlalchemy import select, func, false
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.places.models import Place, FoodVerification
from app.shared.diet import diet_tags_match
from app.shared.errors import NotFoundError
from app.shared.utils import utcnow

logger = logging.getLogger("tripsova.food")


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km — portable across SQLite dev and Postgres prod."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


async def search_food_places(
    db: AsyncSession,
    destination_id: str = None,
    diet_tags: list[str] = None,
    lat: float = None,
    lng: float = None,
    radius: float = None,
) -> list[dict]:
    stmt = select(Place).where(
        Place.type.in_(["RESTAURANT", "CAFE"])
    )

    if destination_id:
        try:
            stmt = stmt.where(Place.destination_id == uuid.UUID(str(destination_id)))
        except (ValueError, TypeError):
            stmt = stmt.where(false())

    stmt = stmt.order_by(Place.tripova_score.desc().nullslast())
    result = await db.execute(stmt)
    places = result.scalars().all()

    # diet_tags is a JSON column (portable across SQLite/Postgres), so membership
    # is filtered in Python — case-insensitive, alias-aware, AND across requested tags.
    if diet_tags:
        requested = [t for t in diet_tags if t]
        if requested:
            places = [p for p in places if diet_tags_match(p.diet_tags, requested)]

    # Distance filter/sort in Python (haversine). The dev DB is SQLite with no
    # PostGIS, so lat/lng live on plain columns — we never touch ST_DWithin here.
    distances: dict[str, float] = {}
    if lat is not None and lng is not None and radius is not None:
        nearby = []
        for p in places:
            if p.latitude is None or p.longitude is None:
                continue
            d = _haversine_km(lat, lng, p.latitude, p.longitude)
            if d <= radius:
                distances[str(p.id)] = round(d, 1)
                nearby.append(p)
        nearby.sort(key=lambda pl: distances[str(pl.id)])
        places = nearby

    verification_counts: dict[uuid.UUID, int] = {}
    place_ids = [p.id for p in places]
    if place_ids:
        count_result = await db.execute(
            select(FoodVerification.place_id, func.count(FoodVerification.id))
            .where(FoodVerification.place_id.in_(place_ids))
            .group_by(FoodVerification.place_id)
        )
        verification_counts = {place_id: count for place_id, count in count_result.all()}

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "type": p.type,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "diet_tags": p.diet_tags,
            "tags": p.tags,
            # How the diet tags were established: a real traveller check ("community"),
            # an OSM/AI guess not yet verified ("suggested"), or none at all.
            "diet_source": (
                "community" if verification_counts.get(p.id, 0) > 0 and bool(p.diet_tags)
                else "suggested" if p.diet_tags
                else None
            ),
            "food_score": p.food_score,
            "tripova_score": p.tripova_score,
            "phone": p.phone,
            "address": p.address,
            "price_range": p.price_range,
            "external_rating": p.external_rating,
            "distance_km": distances.get(str(p.id)),
            "verified_count": verification_counts.get(p.id, 0),
            "photos": p.photos,
            "source": p.source,
            "is_community_verified": verification_counts.get(p.id, 0) > 0,
            "is_diet_trusted": verification_counts.get(p.id, 0) > 0 and bool(p.diet_tags),
        }
        for p in places
    ]


async def discover_food_places(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_km: float = 5.0,
    diet_tags: list[str] = None,
    destination_id: str = None,
    min_existing: int = 12,
) -> list[dict]:
    """Return real nearby restaurants/cafes, ingesting from OpenStreetMap on demand.

    Used for both the city the user lives in (their approximate location) and a
    trip destination. Skips the slow Overpass call when enough nearby rows already
    exist, so repeat visits are fast.

    Falls back to Google Places API when OpenStreetMap returns too few results
    (common in small towns), provided GOOGLE_PLACES_API_KEY is configured.
    """
    existing = await search_food_places(db, lat=lat, lng=lng, radius=radius_km, destination_id=destination_id)
    if len(existing) < min_existing:
        from app.modules.data_sources.ingestion_service import sync_food_places, sync_food_places_from_google
        try:
            await sync_food_places(
                db, lat=lat, lng=lng, radius_m=int(radius_km * 1000), destination_id=destination_id
            )
        except Exception:
            logger.warning("Overpass food sync failed for (%.4f, %.4f); trying Google Places", lat, lng, exc_info=True)
            await db.rollback()

        after_osm = await search_food_places(db, lat=lat, lng=lng, radius=radius_km, destination_id=destination_id)
        if len(after_osm) < min_existing:
            try:
                await sync_food_places_from_google(
                    db, lat=lat, lng=lng, radius_m=int(radius_km * 1000), destination_id=destination_id
                )
            except Exception:
                logger.warning("Google Places fallback also failed for (%.4f, %.4f)", lat, lng, exc_info=True)
                await db.rollback()

    return await search_food_places(
        db, lat=lat, lng=lng, radius=radius_km, diet_tags=diet_tags, destination_id=destination_id
    )


async def verify_food(
    db: AsyncSession,
    place_id: str,
    user_id: str,
    data: dict,
) -> FoodVerification:
    result = await db.execute(select(Place).where(Place.id == place_id))
    place = result.scalar_one_or_none()
    if not place:
        raise NotFoundError("Place not found")

    verification = FoodVerification(
        place_id=place_id,
        user_id=user_id,
        diet_tag=data.get("diet_tag"),
        note=data.get("note", "note") if isinstance(data.get("note"), str) else data.get("note"),
        confidence_score=data.get("confidence_score", 0.8),
        verified_at=utcnow(),
    )
    db.add(verification)

    if data.get("diet_tag") and data["diet_tag"] not in (place.diet_tags or []):
        current_tags = place.diet_tags or []
        place.diet_tags = list(set(current_tags + [data["diet_tag"]]))

    verification_count_result = await db.execute(
        select(func.count(FoodVerification.id)).where(FoodVerification.place_id == place_id)
    )
    verification_count = verification_count_result.scalar() or 0
    place.food_score = min(100, verification_count * 20)
    place.last_verified_at = utcnow()

    await db.flush()
    await db.refresh(verification)
    return verification


async def get_food_verifications(db: AsyncSession, place_id: str) -> list[FoodVerification]:
    result = await db.execute(
        select(FoodVerification)
        .where(FoodVerification.place_id == place_id)
        .order_by(FoodVerification.created_at.desc())
    )
    return result.scalars().all()
