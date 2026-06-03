from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.maps.schemas import RegionMetadataResponse, POIResponse
from app.modules.maps.service import get_region_metadata, get_region_pois, get_nearby_pois

router = APIRouter(prefix="/api/maps", tags=["Maps"])

@router.get("/region/{destination_id}/metadata", response_model=RegionMetadataResponse)
async def region_metadata(destination_id: str, db: AsyncSession = Depends(get_db)):
    result = await get_region_metadata(db, destination_id)
    return RegionMetadataResponse(**result)

@router.get("/region/{destination_id}/pois", response_model=list[POIResponse])
async def region_pois(destination_id: str, db: AsyncSession = Depends(get_db)):
    result = await get_region_pois(db, destination_id)
    return [POIResponse(**p) for p in result]

@router.get("/nearby", response_model=list[POIResponse])
async def nearby_pois(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(5000),
    place_type: str = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db),
):
    result = await get_nearby_pois(db, lat, lng, radius, place_type=place_type)
    return [POIResponse(**p) for p in result]
