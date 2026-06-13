import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.trips.models import Trip
from app.modules.trips.ai_provider import plan_trip
from app.shared.errors import NotFoundError


async def generate_trip(db: AsyncSession, user_id: str, data: dict) -> dict:
    plan = await plan_trip(db, data)
    # `sub` from the JWT is a str; the UUID column wants a UUID on SQLite (Postgres coerces).
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    trip = Trip(
        user_id=uid,
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


async def save_route(db: AsyncSession, user_id: str, data: dict, plan: dict) -> str | None:
    """Persist a computed route plan, if the caller asked us to.

    - `tripId` given  → merge the route into that trip's generated_plan["route"].
    - `save` is true  → create a new standalone trip holding just the route.
    - neither         → return None (compute-only, nothing stored).

    Returns the id of the trip the route now lives on, or None.
    """
    # `sub` from the JWT is a str; the UUID column wants a UUID on SQLite (Postgres coerces).
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    trip_id = data.get("tripId")
    if trip_id:
        tid = trip_id if isinstance(trip_id, uuid.UUID) else uuid.UUID(str(trip_id))
        result = await db.execute(
            select(Trip).where(Trip.id == tid, Trip.user_id == uid)
        )
        trip = result.scalar_one_or_none()
        if not trip:
            raise NotFoundError(f"Trip with id '{trip_id}' not found")
        merged = dict(trip.generated_plan or {})
        merged["route"] = plan
        trip.generated_plan = merged  # reassign so SQLAlchemy tracks the JSON change
        await db.flush()
        return str(trip.id)

    if data.get("save"):
        origin = (plan.get("origin") or {}).get("name") or "Route"
        dest = (plan.get("destination") or {}).get("name") or ""
        title = f"{origin} → {dest}".strip(" →") or "Saved route"
        trip = Trip(
            user_id=uid,
            title=title,
            trip_type="ROUTE",
            offline_required=False,
            generated_plan={"route": plan},
        )
        db.add(trip)
        await db.flush()
        await db.refresh(trip)
        return str(trip.id)

    return None


async def get_user_trips(db: AsyncSession, user_id: str) -> list[Trip]:
    result = await db.execute(
        select(Trip)
        .where(Trip.user_id == user_id)
        .order_by(Trip.created_at.desc())
    )
    return result.scalars().all()


async def get_trip(db: AsyncSession, trip_id: str) -> Trip:
    try:
        tid = trip_id if isinstance(trip_id, uuid.UUID) else uuid.UUID(str(trip_id))
    except ValueError:
        raise NotFoundError(f"Trip with id '{trip_id}' not found")
    result = await db.execute(select(Trip).where(Trip.id == tid))
    trip = result.scalar_one_or_none()
    if not trip:
        raise NotFoundError(f"Trip with id '{trip_id}' not found")
    return trip
