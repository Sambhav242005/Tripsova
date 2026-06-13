from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.modules.admin.schemas import (
    DashboardStatsResponse,
    SyncDestinationResponse,
    SyncPlacesResponse,
    SyncFuelResponse,
    EnrichPlaceResponse,
)
from app.modules.admin.service import get_dashboard_stats
from app.modules.data_sources.ingestion_service import (
    sync_destination,
    sync_places,
    sync_fuel_stations,
    enrich_place,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard", response_model=DashboardStatsResponse, dependencies=[Depends(require_admin)])
async def dashboard(db: AsyncSession = Depends(get_db)):
    return await get_dashboard_stats(db)

@router.post("/sync/destination/{destination_id}", response_model=SyncDestinationResponse, dependencies=[Depends(require_admin)])
async def sync_destination_endpoint(destination_id: str, db: AsyncSession = Depends(get_db)):
    return await sync_destination(db, destination_id)

@router.post("/sync/places/{destination_id}", response_model=SyncPlacesResponse, dependencies=[Depends(require_admin)])
async def sync_places_endpoint(destination_id: str, db: AsyncSession = Depends(get_db)):
    return await sync_places(db, destination_id)

@router.post("/sync/fuel/{destination_id}", response_model=SyncFuelResponse, dependencies=[Depends(require_admin)])
async def sync_fuel_endpoint(destination_id: str, db: AsyncSession = Depends(get_db)):
    return await sync_fuel_stations(db, destination_id)

@router.post("/sync/place/{place_id}/enrich", response_model=EnrichPlaceResponse, dependencies=[Depends(require_admin)])
async def enrich_place_endpoint(place_id: str, db: AsyncSession = Depends(get_db)):
    return await enrich_place(db, place_id)
