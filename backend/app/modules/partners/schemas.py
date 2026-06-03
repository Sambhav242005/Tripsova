from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class PartnerApplyRequest(BaseModel):
    name: str
    type: str
    phone: str
    email: Optional[str] = None
    location: Optional[str] = None


class PartnerResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    name: str
    type: str
    phone: str
    email: Optional[str] = None
    location: Optional[str] = None
    verification_status: str
    trust_score: float
    response_rate: Optional[float] = None
    cancellation_rate: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PartnerListResponse(BaseModel):
    items: list[PartnerResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
