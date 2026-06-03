from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.bookings.models import Booking
from app.shared.errors import NotFoundError


async def create_booking(db: AsyncSession, user_id: str, data: dict) -> Booking:
    booking = Booking(
        user_id=user_id,
        listing_id=data.get("listing_id") or data.get("listingId"),
        partner_id=data.get("partner_id") or data.get("partnerId"),
        destination_id=data.get("destination_id") or data.get("destinationId"),
        start_date=data.get("start_date") or data.get("startDate"),
        end_date=data.get("end_date") or data.get("endDate"),
        amount=data.get("amount"),
        commission_amount=data.get("commission_amount"),
        currency=data.get("currency", "INR"),
        status=data.get("status", "PENDING"),
        metadata=data.get("metadata"),
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    return booking


async def get_user_bookings(db: AsyncSession, user_id: str) -> list[Booking]:
    result = await db.execute(
        select(Booking)
        .where(Booking.user_id == user_id)
        .order_by(Booking.created_at.desc())
    )
    return result.scalars().all()


async def get_all_bookings(
    db: AsyncSession,
    status: str = None,
) -> list[Booking]:
    stmt = select(Booking)
    if status:
        stmt = stmt.where(Booking.status == status)
    stmt = stmt.order_by(Booking.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()
