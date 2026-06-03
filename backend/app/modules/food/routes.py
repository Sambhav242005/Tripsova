from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.food.schemas import FoodVerifyRequest, FoodVerificationResponse, FoodPlaceResponse
from app.modules.food.service import search_food_places, verify_food, get_food_verifications

router = APIRouter(prefix="/api/food", tags=["Food / PureFind"])

@router.get("", response_model=list[FoodPlaceResponse])
async def search_food(
    destination_id: str = Query(None),
    diet_tag: str = Query(None),
    lat: float = Query(None),
    lng: float = Query(None),
    radius: float = Query(None),
    db: AsyncSession = Depends(get_db),
):
    places = await search_food_places(db, destination_id=destination_id, diet_tag=diet_tag, lat=lat, lng=lng, radius=radius)
    return [FoodPlaceResponse.model_validate(p) for p in places]

@router.post("/{place_id}/verify", status_code=201, response_model=FoodVerificationResponse)
async def verify_food_endpoint(
    place_id: str,
    body: FoodVerifyRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    v = await verify_food(db, place_id, user_id, body.model_dump(exclude_none=True))
    return FoodVerificationResponse.model_validate(v)

@router.get("/{place_id}/verifications", response_model=list[FoodVerificationResponse])
async def get_verifications(place_id: str, db: AsyncSession = Depends(get_db)):
    verifications = await get_food_verifications(db, place_id)
    return [FoodVerificationResponse.model_validate(v) for v in verifications]
