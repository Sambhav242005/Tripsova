from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.trips.feasibility import check_leg_feasibility, leg_warning
from app.modules.trips.geocode import GeocodeError, geocode_city
from app.modules.trips.journey_planner import plan_journey
from app.modules.trips.journey_store import (
    create_pending,
    get_record,
    list_journeys,
    run_job,
    save_completed,
)
from app.modules.trips.route_planner import _normalize_legs, plan_route
from app.modules.trips.schemas import (
    JourneyListItem,
    JourneyPlanRequest,
    JourneyPlanResponse,
    JourneyRecordResponse,
    RoutePoint,
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
    legs = _normalize_legs(data)

    # Reject physically-impossible legs (intercity metro, a too-short/airport-less flight,
    # walking across a state). The auto journey planner can't produce these, so only this
    # manual endpoint needs the guard.
    for i, leg in enumerate(legs):
        reason = await check_leg_feasibility(leg["origin"], leg["destination"], leg["transport"])
        if reason:
            prefix = f"Leg {i + 1}: " if len(legs) > 1 else ""
            raise HTTPException(status_code=422, detail=f"{prefix}{reason}")

    result = await plan_route(db, data)

    # Flag the possible-but-unusual legs (water routes, an oddly long bus) as estimates.
    warnings = [w for leg in legs if (w := leg_warning(leg["origin"], leg["destination"], leg["transport"]))]
    if warnings:
        result["notes"] = list(result.get("notes") or []) + warnings

    # Optionally persist (attach to a trip or save as a new one); None when compute-only.
    result["tripId"] = await save_route(db, user_id, data, result)
    return RoutePlanResponse(**result)

@router.get("/geocode", response_model=RoutePoint)
async def geocode_endpoint(
    q: str = Query(..., min_length=1, description="City or place name to resolve to coordinates"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a free-typed place name to coordinates (our DB first, then OpenStreetMap).

    Lets the manual route planner accept *any* city instead of a fixed dropdown —
    the same real-data resolution the auto journey planner already uses.
    """
    try:
        point = await geocode_city(db, q)
    except GeocodeError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return RoutePoint(name=point["name"], latitude=point["latitude"], longitude=point["longitude"])

@router.post("/journey", response_model=JourneyPlanResponse)
async def journey_endpoint(
    body: JourneyPlanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Plan a whole journey from just two city names — the engine picks the modes & cost.

    The result is saved to the traveller's history so they can reopen it later.
    """
    data = body.model_dump()
    try:
        result = await plan_journey(db, data)
    except GeocodeError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    journey_id = await save_completed(db, user_id, data, result)
    return JourneyPlanResponse(id=journey_id, **result)


@router.post("/journey/async", response_model=JourneyRecordResponse, status_code=202)
async def journey_async_endpoint(
    body: JourneyPlanRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Kick off journey planning in the background and return immediately.

    The caller gets a ``pending`` record straight away and polls
    ``GET /api/trips/journeys/{id}`` until it turns ``ready`` (or ``failed``) — so a slow
    plan can keep running while the traveller does something else.
    """
    data = body.model_dump()
    journey_id = await create_pending(user_id, data)
    background_tasks.add_task(run_job, journey_id, data)
    record = await get_record(db, user_id, journey_id)
    if record is None:
        raise HTTPException(status_code=500, detail="Could not start the journey.")
    return JourneyRecordResponse(**record)


@router.get("/journeys", response_model=list[JourneyListItem])
async def list_journeys_endpoint(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """The traveller's saved journeys, newest first."""
    return [JourneyListItem(**j) for j in await list_journeys(db, user_id)]


@router.get("/journeys/{journey_id}", response_model=JourneyRecordResponse)
async def get_journey_endpoint(
    journey_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Reopen a saved journey (or poll a background one's status)."""
    record = await get_record(db, user_id, journey_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Journey not found")
    return JourneyRecordResponse(**record)

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
