from pydantic import BaseModel
from typing import Optional, Any


class RegionMetadataResponse(BaseModel):
    destination_id: str
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    bounds: dict
    center: dict
    place_count: int = 0
    has_offline_data: bool = False
    zoom: int = 12


class POIResponse(BaseModel):
    id: str
    name: str
    type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    external_rating: Optional[float] = None
    tripova_score: Optional[float] = None
    tags: Optional[list] = None
    phone: Optional[str] = None
    distance_m: Optional[float] = None


class NearbyPOIQuery(BaseModel):
    lat: float
    lng: float
    radius: float = 5000
    type: Optional[str] = None
