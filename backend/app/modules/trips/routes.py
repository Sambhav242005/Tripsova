from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.trips.schemas import TripGenerateRequest, TripGenerateResponse, TripResponse
from app.modules.trips.service import generate_trip, get_user_trips, get_trip

router = APIRouter(prefix="/api/trips", tags=["Trips"])

@router.post("/generate", response_model=TripGenerateResponse)
async def generate_trip_endpoint(
    body: TripGenerateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_trip(db, user_id, body.model_dump())
    return TripGenerateResponse(**result)

@router.get("/my", response_model=list[TripResponse])
async def my_trips(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trips = await get_user_trips(db, user_id)
    return [TripResponse.model_validate(t) for t in trips]

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip_endpoint(trip_id: str, db: AsyncSession = Depends(get_db)):
    trip = await get_trip(db, trip_id)
    return TripResponse.model_validate(trip)
