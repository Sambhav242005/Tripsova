from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.shared.errors import NotFoundError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query
from app.shared.utils import slugify


async def get_destinations(
    db: AsyncSession,
    search: str = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResult:
    stmt = select(Destination)
    if search:
        stmt = stmt.where(
            func.lower(Destination.name).like(f"%{search.lower()}%")
            | func.lower(Destination.description).like(f"%{search.lower()}%")
            | func.lower(Destination.city).like(f"%{search.lower()}%")
            | func.lower(Destination.state).like(f"%{search.lower()}%")
            | func.lower(Destination.country).like(f"%{search.lower()}%")
        )
    stmt = stmt.order_by(Destination.name)
    params = PaginatedParams(page=page, per_page=per_page)
    return await paginate_query(db, stmt, params)


async def get_destination_by_slug(db: AsyncSession, slug: str) -> Destination:
    result = await db.execute(select(Destination).where(Destination.slug == slug))
    dest = result.scalar_one_or_none()
    if not dest:
        raise NotFoundError(f"Destination with slug '{slug}' not found")
    return dest


async def get_destination_by_id(db: AsyncSession, dest_id: str) -> Destination:
    result = await db.execute(select(Destination).where(Destination.id == dest_id))
    dest = result.scalar_one_or_none()
    if not dest:
        raise NotFoundError(f"Destination with id '{dest_id}' not found")
    return dest


async def create_destination(db: AsyncSession, data: dict) -> Destination:
    slug = slugify(data.get("name", ""))
    if not slug:
        raise ValueError("Destination name is required to generate slug")

    final_slug = data.get("slug") or slug
    dest = Destination(
        name=data["name"],
        slug=final_slug,
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        description=data.get("description"),
        best_time_to_visit=data.get("best_time_to_visit"),
        average_budget_min=data.get("average_budget_min"),
        average_budget_max=data.get("average_budget_max"),
        safety_summary=data.get("safety_summary"),
        weather_summary=data.get("weather_summary"),
        crowd_level=data.get("crowd_level"),
        internet_quality=data.get("internet_quality"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        photos=data.get("photos"),
        tags=data.get("tags"),
    )
    db.add(dest)
    await db.flush()
    await db.refresh(dest)
    return dest


async def update_destination(db: AsyncSession, dest_id: str, data: dict) -> Destination:
    dest = await get_destination_by_id(db, dest_id)
    allowed_fields = {
        "name", "description", "city", "state", "country",
        "best_time_to_visit", "average_budget_min", "average_budget_max",
        "safety_summary", "weather_summary", "crowd_level",
        "internet_quality", "latitude", "longitude", "photos", "tags",
    }
    for key, value in data.items():
        if key in allowed_fields and hasattr(dest, key):
            setattr(dest, key, value)
            if key == "name":
                dest.slug = slugify(value)
    await db.flush()
    await db.refresh(dest)
    return dest
