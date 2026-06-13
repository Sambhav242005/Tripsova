from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.trips.geocode import GeocodeError
from app.modules.trips.journey_planner import plan_journey
from app.modules.trips.route_planner import plan_route
from app.modules.trips.schemas import (
    JourneyPlanRequest,
    JourneyPlanResponse,
    RoutePlanRequest,
    RoutePlanResponse,
    TripGenerateRequest,
    TripGenerateResponse,
    TripResponse,
)
from app.modules.trips.service import generate_trip, get_user_trips, get_trip, save_route

router = APIRouter(prefix="/api/trips", tags=["Trips"])

@router.post("/route-plan", response_model=RoutePlanResponse)
async def route_plan_endpoint(
    body: RoutePlanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump()
    result = await plan_route(db, data)
    # Optionally persist (attach to a trip or save as a new one); None when compute-only.
    result["tripId"] = await save_route(db, user_id, data, result)
    return RoutePlanResponse(**result)

@router.post("/journey", response_model=JourneyPlanResponse)
async def journey_endpoint(
    body: JourneyPlanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Plan a whole journey from just two city names — the engine picks the modes & cost."""
    try:
        result = await plan_journey(db, body.model_dump())
    except GeocodeError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JourneyPlanResponse(**result)

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
