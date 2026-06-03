from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.trips.models import Trip
from app.modules.trips.ai_provider import plan_trip
from app.shared.errors import NotFoundError


async def generate_trip(db: AsyncSession, user_id: str, data: dict) -> dict:
    plan = await plan_trip(db, data)
    trip = Trip(
        user_id=user_id,
        destination_id=plan.get("destinationId"),
        title=data.get("destination", "My Trip"),
        trip_type=data.get("tripType", "SOLO"),
        days=data.get("days", 3),
        budget=data.get("budget"),
        people_count=data.get("peopleCount"),
        travel_style=data.get("travelStyle"),
        diet_preference=data.get("dietPreference"),
        offline_required=data.get("offlineRequired", False),
        generated_plan=plan,
    )
    db.add(trip)
    await db.flush()
    await db.refresh(trip)
    plan["tripId"] = str(trip.id)
    return plan


async def get_user_trips(db: AsyncSession, user_id: str) -> list[Trip]:
    result = await db.execute(
        select(Trip)
        .where(Trip.user_id == user_id)
        .order_by(Trip.created_at.desc())
    )
    return result.scalars().all()


async def get_trip(db: AsyncSession, trip_id: str) -> Trip:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise NotFoundError(f"Trip with id '{trip_id}' not found")
    return trip
