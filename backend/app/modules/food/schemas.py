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


class FoodDiscoverRequest(BaseModel):
    lat: float
    lng: float
    radius_km: Optional[float] = 5.0
    diet_tag: Optional[list[str]] = None
    destination_id: Optional[UUID] = None


class FoodPlaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    diet_tags: Optional[list] = None
    tags: Optional[list] = None          # descriptive cuisine/type tags (never a diet claim)
    diet_source: Optional[str] = None    # "community" | "suggested" | None
    food_score: float
    tripova_score: float
    phone: Optional[str] = None
    verified_count: int = 0
    distance_km: Optional[float] = None
    photos: Optional[list] = None
    source: Optional[str] = None
    is_community_verified: bool = False
    is_diet_trusted: bool = False

    model_config = {"from_attributes": True}
