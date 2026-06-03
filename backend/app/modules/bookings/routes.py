from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id, require_admin
from app.modules.bookings.schemas import BookingCreate, BookingResponse
from app.modules.bookings.service import create_booking, get_user_bookings, get_all_bookings

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])

@router.post("", status_code=201, response_model=BookingResponse)
async def create_booking_endpoint(
    body: BookingCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    b = await create_booking(db, user_id, body.model_dump(exclude_none=True))
    return BookingResponse.model_validate(b)

@router.get("/my", response_model=list[BookingResponse])
async def my_bookings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    bookings = await get_user_bookings(db, user_id)
    return [BookingResponse.model_validate(b) for b in bookings]

@router.get("", response_model=list[BookingResponse], dependencies=[Depends(require_admin)])
async def all_bookings(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    bookings = await get_all_bookings(db, status=status)
    return [BookingResponse.model_validate(b) for b in bookings]
