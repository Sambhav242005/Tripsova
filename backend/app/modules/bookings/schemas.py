from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class BookingCreate(BaseModel):
    listing_id: UUID
    partner_id: Optional[UUID] = None
    destination_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: Optional[dict] = None


class BookingResponse(BaseModel):
    id: UUID
    user_id: UUID
    listing_id: Optional[UUID] = None
    partner_id: Optional[UUID] = None
    destination_id: Optional[UUID] = None
    amount: Optional[float] = None
    commission_amount: Optional[float] = None
    currency: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    items: list[BookingResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
