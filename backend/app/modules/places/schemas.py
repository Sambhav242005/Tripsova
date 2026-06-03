from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class PlaceCreate(BaseModel):
    destination_id: Optional[UUID] = None
    name: str
    slug: Optional[str] = None
    type: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_range: Optional[str] = None
    opening_hours: Optional[dict] = None
    photos: Optional[list] = None
    tags: Optional[list] = None
    diet_tags: Optional[list] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    external_rating: Optional[float] = None
    external_review_count: Optional[int] = None


class PlaceUpdate(BaseModel):
    destination_id: Optional[UUID] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_range: Optional[str] = None
    opening_hours: Optional[dict] = None
    photos: Optional[list] = None
    tags: Optional[list] = None
    diet_tags: Optional[list] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    external_rating: Optional[float] = None
    external_review_count: Optional[int] = None


class PlaceResponse(BaseModel):
    id: UUID
    destination_id: Optional[UUID] = None
    name: str
    slug: str
    type: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_range: Optional[str] = None
    opening_hours: Optional[dict] = None
    photos: Optional[list] = None
    tags: Optional[list] = None
    diet_tags: Optional[list] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    external_rating: Optional[float] = None
    external_review_count: Optional[int] = None
    external_rating_source: Optional[str] = None
    popularity_score: float
    confidence_score: float
    tripova_score: float
    trust_score: float
    safety_score: float
    food_score: float
    source: Optional[str] = None
    is_partner_listed: bool
    is_offline_available: bool
    last_verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlaceScoreResponse(BaseModel):
    finalScore: float
    ratingScore: Optional[float] = None
    reviewConfidence: Optional[float] = None
    popularityScore: float
    trustScore: float
    travellerVerificationScore: float
    freshnessScore: float
    foodScore: float
    safetyScore: float
    penalties: list[str]
    explanation: str


class NearbyQuery(BaseModel):
    lat: float
    lng: float
    radius: float
    type: Optional[str] = None
    diet: Optional[str] = None


class PlaceListResponse(BaseModel):
    items: list[PlaceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
