from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class FeedPostCreate(BaseModel):
    destination_id: Optional[UUID] = None
    place_id: Optional[UUID] = None
    content: str
    media: Optional[list] = None
    crowd_level: Optional[str] = None
    weather_note: Optional[str] = None
    safety_note: Optional[str] = None
    price_note: Optional[str] = None
    food_note: Optional[str] = None


class FeedPostResponse(BaseModel):
    id: UUID
    destination_id: Optional[UUID] = None
    place_id: Optional[UUID] = None
    user_id: UUID
    content: str
    media: Optional[list] = None
    crowd_level: Optional[str] = None
    weather_note: Optional[str] = None
    safety_note: Optional[str] = None
    price_note: Optional[str] = None
    food_note: Optional[str] = None
    helpful_count: int
    report_count: int
    verification_score: float
    expires_at: Optional[datetime] = None
    created_at: datetime
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None

    model_config = {"from_attributes": True}


class FeedPostListResponse(BaseModel):
    items: list[FeedPostResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
