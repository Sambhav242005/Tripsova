from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class OfflinePackCreate(BaseModel):
    destinationId: UUID
    tripId: Optional[UUID] = None
    days: Optional[int] = None
    includeFood: Optional[bool] = None
    includeEmergency: Optional[bool] = None
    includeMapMetadata: Optional[bool] = None
    includeFeedSummary: Optional[bool] = None


class OfflinePackResponse(BaseModel):
    id: UUID
    user_id: UUID
    destination_id: Optional[UUID] = None
    trip_id: Optional[UUID] = None
    title: Optional[str] = None
    data_version: int
    generated_at: datetime
    expires_at: Optional[datetime] = None
    size_bytes: Optional[int] = None

    model_config = {"from_attributes": True}


class OfflinePackDownloadResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    destination: dict
    places: list
    itinerary: Optional[list] = None
    food_spots: list
    emergency_places: list
    safety_notes: list
    transport_notes: Optional[list] = None
    contacts: list
    feed_summary: Optional[list] = None
    coordinates: dict
    map_metadata: Optional[dict] = None
    generated_at: datetime
    expires_at: Optional[datetime] = None
    data_version: int


class SyncRequest(BaseModel):
    client_last_synced_at: Optional[datetime] = None
    local_changes: Optional[dict] = None


class SyncResponse(BaseModel):
    accepted_changes: Optional[dict] = None
    conflicts: Optional[dict] = None
    server_data_version: int
