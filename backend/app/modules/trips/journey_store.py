"""Persistence + background execution for auto-planned journeys.

The journey_planner *computes* a journey; this module saves the result so the
traveller can reopen it, and runs the (slow) computation as a background job when
they'd rather not wait. No fabricated data — a journey row only ever holds a real
planner result, or a pending/failed status while one is being produced.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.modules.trips.geocode import GeocodeError
from app.modules.trips.journey_planner import plan_journey
from app.modules.users.models import Journey

logger = logging.getLogger("tripsova.journey.store")


def _uuid(value: str) -> uuid.UUID:
    return uuid.UUID(str(value))


def _record(j: Journey) -> dict:
    """Full record (used when reopening a saved journey)."""
    return {
        "id": str(j.id),
        "origin": j.origin,
        "destination": j.destination,
        "roundTrip": bool(j.round_trip),
        "peopleCount": j.people_count or 1,
        "budget": j.budget,
        "status": j.status,
        "result": j.result,
        "error": j.error,
        "createdAt": j.created_at,
    }


def _list_item(j: Journey) -> dict:
    """Lightweight row for the history list (no full route payload)."""
    result = j.result or {}
    cost = result.get("cost") or {}
    return {
        "id": str(j.id),
        "origin": j.origin,
        "destination": j.destination,
        "roundTrip": bool(j.round_trip),
        "peopleCount": j.people_count or 1,
        "status": j.status,
        "total": cost.get("total"),
        "chosenModes": result.get("chosenModes") or [],
        "createdAt": j.created_at,
    }


def _new_journey(user_id: str, data: dict, *, status: str, result: Optional[dict]) -> Journey:
    departure = data.get("departureTime")
    if isinstance(departure, str):
        try:
            departure = datetime.fromisoformat(departure.replace("Z", "+00:00"))
        except ValueError:
            departure = None
    return Journey(
        user_id=_uuid(user_id),
        origin=(data.get("origin") or "").strip(),
        destination=(data.get("destination") or "").strip(),
        round_trip=bool(data.get("roundTrip")),
        people_count=max(1, int(data.get("peopleCount") or 1)),
        budget=data.get("budget"),
        departure_time=departure,
        status=status,
        result=result,
    )


async def save_completed(db: AsyncSession, user_id: str, data: dict, result: dict) -> str:
    """Persist a journey that's already been planned synchronously. Returns its id."""
    journey = _new_journey(user_id, data, status="ready", result=result)
    db.add(journey)
    await db.flush()
    return str(journey.id)


async def list_journeys(db: AsyncSession, user_id: str, limit: int = 50) -> list[dict]:
    result = await db.execute(
        select(Journey)
        .where(Journey.user_id == _uuid(user_id))
        .order_by(Journey.created_at.desc())
        .limit(limit)
    )
    return [_list_item(j) for j in result.scalars().all()]


async def get_record(db: AsyncSession, user_id: str, journey_id: str) -> Optional[dict]:
    result = await db.execute(
        select(Journey).where(
            Journey.id == _uuid(journey_id),
            Journey.user_id == _uuid(user_id),
        )
    )
    journey = result.scalar_one_or_none()
    return _record(journey) if journey else None


async def create_pending(user_id: str, data: dict) -> str:
    """Insert a pending journey in its own committed transaction, so the background
    job (and the immediate poll) can see it. Returns the new id."""
    async with async_session_factory() as db:
        journey = _new_journey(user_id, data, status="pending", result=None)
        db.add(journey)
        await db.commit()
        await db.refresh(journey)
        return str(journey.id)


async def run_job(journey_id: str, data: dict) -> None:
    """Background task: compute the journey and write the result back to its row."""
    async with async_session_factory() as db:
        try:
            result = await plan_journey(db, data)
            await _finish(db, journey_id, status="ready", result=result, error=None)
        except GeocodeError as exc:
            await _finish(db, journey_id, status="failed", result=None, error=str(exc))
        except Exception:
            logger.exception("background journey %s failed", journey_id)
            await _finish(db, journey_id, status="failed", result=None, error="Could not plan this journey.")


async def _finish(db: AsyncSession, journey_id: str, *, status: str, result: Optional[dict], error: Optional[str]) -> None:
    res = await db.execute(select(Journey).where(Journey.id == _uuid(journey_id)))
    journey = res.scalar_one_or_none()
    if journey is None:
        return
    journey.status = status
    journey.result = result
    journey.error = error
    journey.updated_at = datetime.now(timezone.utc)
    await db.commit()
