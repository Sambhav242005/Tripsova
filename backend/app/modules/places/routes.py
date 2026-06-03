from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.modules.places.schemas import PlaceCreate, PlaceUpdate, PlaceResponse, PlaceScoreResponse
from app.modules.places.service import get_places, get_place, get_place_score, get_nearby_places, create_place, update_place
from app.shared.pagination import PaginatedResult

router = APIRouter(prefix="/api/places", tags=["Places"])

@router.get("", response_model=dict)
async def list_places(
    destination_id: str = Query(None),
    type: str = Query(None),
    search: str = Query(None),
    diet: str = Query(None),
    sort_by: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await get_places(db, destination_id=destination_id, place_type=type, search=search, diet=diet, sort_by=sort_by, page=page, per_page=per_page)
    return {
        "items": [PlaceResponse.model_validate(p) for p in result.items],
        "total": result.total,
        "page": result.page,
        "per_page": result.per_page,
        "total_pages": result.total_pages,
    }

@router.get("/nearby", response_model=list[PlaceResponse])
async def nearby_places(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(5000),
    place_type: str = Query(None, alias="type"),
    diet: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    places = await get_nearby_places(db, lat, lng, radius, place_type=place_type, diet=diet)
    return [PlaceResponse.model_validate(p) for p in places]

@router.get("/{place_id}", response_model=PlaceResponse)
async def get_place_endpoint(place_id: str, db: AsyncSession = Depends(get_db)):
    place = await get_place(db, place_id)
    return PlaceResponse.model_validate(place)

@router.get("/{place_id}/score", response_model=PlaceScoreResponse)
async def get_place_score_endpoint(place_id: str, db: AsyncSession = Depends(get_db)):
    result = await get_place_score(db, place_id)
    return PlaceScoreResponse(**result)

@router.post("", status_code=201, response_model=PlaceResponse, dependencies=[Depends(require_admin)])
async def create_place_endpoint(body: PlaceCreate, db: AsyncSession = Depends(get_db)):
    place = await create_place(db, body.model_dump())
    return PlaceResponse.model_validate(place)

@router.put("/{place_id}", response_model=PlaceResponse, dependencies=[Depends(require_admin)])
async def update_place_endpoint(place_id: str, body: PlaceUpdate, db: AsyncSession = Depends(get_db)):
    place = await update_place(db, place_id, body.model_dump(exclude_none=True))
    return PlaceResponse.model_validate(place)
