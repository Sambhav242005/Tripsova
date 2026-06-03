from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class TripGenerateRequest(BaseModel):
    destination: str
    days: int
    budget: float
    peopleCount: int
    travelStyle: Optional[list[str]] = None
    dietPreference: Optional[list[str]] = None
    tripType: str
    startDate: Optional[datetime] = None
    offlineRequired: Optional[bool] = None


class TripGenerateResponse(BaseModel):
    summary: str
    itinerary: list
    recommendedPlaces: list
    recommendedFood: list
    estimatedBudget: dict
    safetyNotes: list
    offlinePackSuggested: bool


class TripResponse(BaseModel):
    id: UUID
    user_id: UUID
    destination_id: Optional[UUID] = None
    title: Optional[str] = None
    trip_type: Optional[str] = None
    days: Optional[int] = None
    budget: Optional[float] = None
    people_count: Optional[int] = None
    travel_style: Optional[dict] = None
    diet_preference: Optional[dict] = None
    start_date: Optional[datetime] = None
    offline_required: bool
    generated_plan: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
