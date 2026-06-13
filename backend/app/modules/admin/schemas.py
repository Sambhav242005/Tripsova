from typing import Optional

from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    users: int
    destinations: int
    places: int
    bookings: int
    feed_posts: int


class SyncDestinationResponse(BaseModel):
    destination_id: str
    description_updated: bool
    coords_updated: bool
    sources: list[Optional[str]]


class SyncPlacesResponse(BaseModel):
    destination_id: str
    created: int
    updated: int
    skipped: int


class SyncFuelResponse(BaseModel):
    destination_id: str
    created: int
    updated: int
    skipped: int


class EnrichPlaceResponse(BaseModel):
    place_id: str
    enriched_fields: list[str]
    tripova_score: Optional[float] = None
