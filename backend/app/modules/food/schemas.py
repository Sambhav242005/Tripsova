from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class FoodVerifyRequest(BaseModel):
    diet_tag: str
    note: Optional[str] = None
    media: Optional[list] = None
    confidence_score: Optional[float] = None


class FoodVerificationResponse(BaseModel):
    id: UUID
    place_id: UUID
    user_id: UUID
    diet_tag: str
    note: Optional[str] = None
    confidence_score: float
    media: Optional[list] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FoodSearchQuery(BaseModel):
    destination_id: Optional[UUID] = None
    diet_tag: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius: Optional[float] = None


class FoodPlaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    diet_tags: Optional[list] = None
    food_score: float
    tripova_score: float
    phone: Optional[str] = None
    verified_count: int = 0

    model_config = {"from_attributes": True}
