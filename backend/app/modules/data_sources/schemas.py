from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class SyncRequest(BaseModel):
    source: Optional[str] = None


class SyncResponse(BaseModel):
    status: str
    places_added: int
    places_updated: int
    errors: list[str]


class DeepReviewRequest(BaseModel):
    placeId: Optional[UUID] = None
    destinationId: Optional[UUID] = None
    placeName: str
    destinationName: str
    userQuestion: Optional[str] = None
    includeReddit: Optional[bool] = None
    includeWeb: Optional[bool] = None


class DeepReviewResponse(BaseModel):
    overallSummary: str
    positiveSignals: list[str]
    negativeSignals: list[str]
    repeatedComplaints: list[str]
    safetyWarnings: list[str]
    foodWarnings: list[str]
    crowdWarnings: list[str]
    sentiment: str
    sentimentScore: float
    sentimentMagnitude: float
    confidenceScore: float
    sourcesUsed: list[dict]
    lastCheckedAt: datetime
