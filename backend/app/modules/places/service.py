import uuid

from sqlalchemy import select, func, false
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.places.models import Place
from app.shared.errors import NotFoundError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query
from app.shared.utils import slugify
from app.modules.places.ranking import calculate_tripova_score


async def get_places(
    db: AsyncSession,
    destination_id: str = None,
    place_type: str = None,
    search: str = None,
    diet: str = None,
    sort_by: str = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResult:
    stmt = select(Place)
    if destination_id:
        try:
            stmt = stmt.where(Place.destination_id == uuid.UUID(str(destination_id)))
        except (ValueError, TypeError):
            stmt = stmt.where(false())
    if place_type:
        stmt = stmt.where(Place.type == place_type)
    if search:
        stmt = stmt.where(func.lower(Place.name).like(f"%{search.lower()}%"))
    if diet:
        stmt = stmt.where(Place.diet_tags.any(diet))

    if sort_by == "tripova_score":
        stmt = stmt.order_by(Place.tripova_score.desc().nullslast())
    else:
        stmt = stmt.order_by(Place.popularity_score.desc().nullslast(), Place.name)

    params = PaginatedParams(page=page, per_page=per_page)
    return await paginate_query(db, stmt, params)


async def get_place(db: AsyncSession, place_id: str) -> Place:
    # Resolve by UUID when the identifier parses as one, otherwise fall back to
    # the SEO-friendly slug (used by the public /food/[slug] SSR route).
    pid: uuid.UUID | None = None
    if isinstance(place_id, uuid.UUID):
        pid = place_id
    else:
        try:
            pid = uuid.UUID(str(place_id))
        except (ValueError, TypeError):
            pid = None

    if pid is not None:
        stmt = select(Place).where(Place.id == pid)
    else:
        stmt = select(Place).where(Place.slug == str(place_id))

    result = await db.execute(stmt)
    place = result.scalar_one_or_none()
    if not place:
        raise NotFoundError(f"Place with id '{place_id}' not found")
    return place


async def get_place_score(db: AsyncSession, place_id: str) -> dict:
    place = await get_place(db, place_id)
    score_data = await calculate_tripova_score(db, place)
    return score_data


async def get_nearby_places(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius: float,
    place_type: str = None,
    diet: str = None,
):
    radius_meters = radius * 1000
    # Build geography points on the fly from the stored lat/lng columns so we do
    # not need a separate stored geometry column (keeps the dev SQLite schema and
    # the PostGIS production schema identical). ST_DWithin on geography is metres.
    origin = func.geography(func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326))
    place_point = func.geography(
        func.ST_SetSRID(func.ST_MakePoint(Place.longitude, Place.latitude), 4326)
    )
    stmt = select(Place).where(
        Place.latitude.isnot(None),
        Place.longitude.isnot(None),
        func.ST_DWithin(place_point, origin, radius_meters),
    )
    if place_type:
        stmt = stmt.where(Place.type == place_type)
    if diet:
        stmt = stmt.where(Place.diet_tags.any(diet))
    stmt = stmt.order_by(Place.tripova_score.desc().nullslast())
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_place(db: AsyncSession, data: dict) -> Place:
    slug = slugify(data.get("name", ""))
    place = Place(
        name=data["name"],
        slug=slug,
        destination_id=data.get("destination_id"),
        type=data.get("type"),
        latitude=data.get("latitude") or data.get("lat"),
        longitude=data.get("longitude") or data.get("lng"),
        external_rating=data.get("external_rating") or data.get("rating"),
        external_review_count=data.get("external_review_count") or data.get("review_count"),
        diet_tags=data.get("diet_tags", []),
        phone=data.get("phone"),
        website=data.get("website"),
        address=data.get("address"),
        price_range=data.get("price_range"),
        photos=data.get("photos"),
        tags=data.get("tags"),
        opening_hours=data.get("opening_hours"),
    )
    if place.latitude is not None and place.longitude is not None:
        place.geom_wkt = f"SRID=4326;POINT({place.longitude} {place.latitude})"
    db.add(place)
    await db.flush()
    await db.refresh(place)
    return place


async def update_place(db: AsyncSession, place_id: str, data: dict) -> Place:
    place = await get_place(db, place_id)
    allowed_fields = {
        "name", "type", "latitude", "longitude", "external_rating",
        "external_review_count", "diet_tags", "phone", "website",
        "address", "price_range", "photos", "tags", "opening_hours",
        "destination_id", "is_partner_listed",
    }
    for key, value in data.items():
        if key in allowed_fields and hasattr(place, key):
            setattr(place, key, value)
    if "latitude" in data or "longitude" in data:
        lat = place.latitude
        lng = place.longitude
        if lat is not None and lng is not None:
            place.geom_wkt = f"SRID=4326;POINT({lng} {lat})"
    await db.flush()
    await db.refresh(place)
    return place


async def update_place_score(db: AsyncSession, place_id: str) -> None:
    place = await get_place(db, place_id)
    score_data = await calculate_tripova_score(db, place)
    place.tripova_score = score_data["finalScore"]
    await db.flush()
