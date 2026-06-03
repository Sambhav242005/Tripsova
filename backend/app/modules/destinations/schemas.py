from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class DestinationCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    city: str
    state: str
    country: str
    description: str
    best_time_to_visit: str
    average_budget_min: float
    average_budget_max: float
    safety_summary: str
    weather_summary: str
    crowd_level: str
    internet_quality: str
    latitude: float
    longitude: float
    photos: Optional[list] = None
    tags: Optional[list] = None


class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    average_budget_min: Optional[float] = None
    average_budget_max: Optional[float] = None
    safety_summary: Optional[str] = None
    weather_summary: Optional[str] = None
    crowd_level: Optional[str] = None
    internet_quality: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: Optional[list] = None
    tags: Optional[list] = None


class DestinationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    city: str
    state: str
    country: str
    description: str
    best_time_to_visit: str
    average_budget_min: Optional[float] = None
    average_budget_max: Optional[float] = None
    safety_summary: Optional[str] = None
    weather_summary: Optional[str] = None
    crowd_level: Optional[str] = None
    internet_quality: Optional[str] = None
    offline_available: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: Optional[list] = None
    tags: Optional[list] = None
    data_version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
