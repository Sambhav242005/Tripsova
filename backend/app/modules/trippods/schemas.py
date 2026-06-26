from pydantic import BaseModel
from typing import Any, Optional
from uuid import UUID
from datetime import datetime


class TripPodCreate(BaseModel):
    destination_id: Optional[UUID] = None
    title: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    travel_style: Optional[list[str] | dict[str, Any]] = None
    max_members: Optional[int] = None
    gender_preference: Optional[str] = None
    verification_required: Optional[bool] = None


class TripPodPendingRequest(BaseModel):
    member_id: UUID
    user_id: UUID
    user_name: str
    user_avatar: str
    status: str
    created_at: datetime


class TripPodResponse(BaseModel):
    id: UUID
    creator_id: UUID
    destination_id: Optional[UUID] = None
    title: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    travel_style: Optional[list[str] | dict[str, Any]] = None
    max_members: Optional[int] = None
    gender_preference: Optional[str] = None
    verification_required: Optional[bool] = None
    status: str
    created_at: datetime
    updated_at: datetime
    member_count: Optional[int] = None
    # Host display fields, enriched server-side from the creator's user record.
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    my_member_status: Optional[str] = None
    my_member_id: Optional[UUID] = None
    pending_request_count: int = 0
    pending_requests: list[TripPodPendingRequest] = []

    model_config = {"from_attributes": True}


class TripPodListResponse(BaseModel):
    items: list[TripPodResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
