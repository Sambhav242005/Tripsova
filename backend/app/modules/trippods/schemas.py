from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class TripPodCreate(BaseModel):
    destination_id: UUID
    title: str
    start_date: datetime
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    travel_style: Optional[list] = None
    max_members: Optional[int] = None
    gender_preference: Optional[str] = None
    verification_required: Optional[bool] = None


class TripPodResponse(BaseModel):
    id: UUID
    creator_id: UUID
    destination_id: Optional[UUID] = None
    title: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    travel_style: Optional[dict] = None
    max_members: Optional[int] = None
    gender_preference: Optional[str] = None
    verification_required: Optional[bool] = None
    status: str
    created_at: datetime
    updated_at: datetime
    member_count: Optional[int] = None

    model_config = {"from_attributes": True}


class TripPodListResponse(BaseModel):
    items: list[TripPodResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
