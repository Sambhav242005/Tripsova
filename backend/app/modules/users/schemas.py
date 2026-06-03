from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    travel_style: Optional[dict] = None
    diet_preference: Optional[dict] = None


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    verification_status: str
    trust_score: float
    travel_style: Optional[dict] = None
    diet_preference: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
