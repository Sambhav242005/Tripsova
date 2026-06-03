import re

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.places.models import Place, PlaceSource
from app.shared.utils import utcnow


async def normalize_place_name(name: str) -> str:
    name = name.strip()
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"[,\s]*\(.*?\)", "", name).strip()
    name = re.sub(r"[,\s]*\[.*?\]", "", name).strip()
    prefixes = ["The ", "A ", "An ", "Hotel ", "Restaurant ", "Cafe ", "Café "]
    for prefix in prefixes:
        if name.lower().startswith(prefix.lower()):
            name = name[len(prefix):].strip()
            break
    return name.title()


async def deduplicate_places(
    db: AsyncSession,
    name: str,
    lat: float,
    lng: float,
    source_name: str,
) -> tuple[Place | None, bool]:
    if lat is not None and lng is not None:
        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        stmt = select(Place).where(
            func.ST_DWithin(
                Place.geom,
                func.ST_GeogFromText(point_wkt),
                100,
            )
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            return existing, True

    if name:
        normalized = await normalize_place_name(name)
        stmt = select(Place).where(
            func.lower(Place.name).contains(normalized.lower())
        )
        result = await db.execute(stmt.limit(5))
        existing = result.scalars().first()
        if existing:
            return existing, True

    return None, False


async def merge_place_sources(
    db: AsyncSession,
    primary_place: Place,
    secondary_data: dict,
) -> Place:
    if not primary_place.external_rating and secondary_data.get("rating"):
        primary_place.external_rating = secondary_data["rating"]
    if not primary_place.external_review_count and secondary_data.get("review_count"):
        primary_place.external_review_count = secondary_data["review_count"]
    if not primary_place.phone and secondary_data.get("phone"):
        primary_place.phone = secondary_data["phone"]
    if not primary_place.website and secondary_data.get("website"):
        primary_place.website = secondary_data["website"]
    if not primary_place.address and secondary_data.get("address"):
        primary_place.address = secondary_data["address"]

    source = PlaceSource(
        place_id=primary_place.id,
        source_name=secondary_data.get("source", "unknown"),
        source_place_id=secondary_data.get("source_id"),
        rating=secondary_data.get("rating"),
        review_count=secondary_data.get("review_count"),
        url=secondary_data.get("url"),
        last_fetched_at=utcnow(),
        confidence=secondary_data.get("confidence", 0.5),
    )
    db.add(source)

    await db.flush()
    await db.refresh(primary_place)
    return primary_place
