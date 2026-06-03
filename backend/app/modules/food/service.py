from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.places.models import Place, FoodVerification
from app.shared.errors import NotFoundError
from app.shared.utils import utcnow


async def search_food_places(
    db: AsyncSession,
    destination_id: str = None,
    diet_tag: str = None,
    lat: float = None,
    lng: float = None,
    radius: float = None,
) -> list[dict]:
    stmt = select(Place).where(
        Place.type.in_(["RESTAURANT", "CAFE"])
    )

    if destination_id:
        stmt = stmt.where(Place.destination_id == destination_id)
    if diet_tag:
        stmt = stmt.where(Place.diet_tags.any(diet_tag))
    if lat is not None and lng is not None and radius is not None:
        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        radius_meters = radius * 1000
        stmt = stmt.where(
            func.ST_DWithin(
                Place.geom,
                func.ST_GeogFromText(point_wkt),
                radius_meters,
            )
        )

    stmt = stmt.order_by(Place.tripova_score.desc().nullslast())
    result = await db.execute(stmt)
    places = result.scalars().all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "type": p.type,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "diet_tags": p.diet_tags,
            "food_score": p.food_score,
            "tripova_score": p.tripova_score,
            "phone": p.phone,
            "address": p.address,
            "price_range": p.price_range,
            "external_rating": p.external_rating,
        }
        for p in places
    ]


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
