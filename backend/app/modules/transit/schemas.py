from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RouteSuggestion(BaseModel):
    route_id: int
    route_no: str
    route_name: Optional[str] = None


class StopSuggestion(BaseModel):
    station_id: int
    station_name: str
    latitude: float
    longitude: float


class LiveBus(BaseModel):
    vehicle_id: int
    vehicle_number: str
    latitude: float
    longitude: float
    heading: int
    eta: Optional[str] = None
    service_type: Optional[str] = None
    last_refresh: Optional[str] = None


class RouteStation(BaseModel):
    station_id: int
    station_name: str
    latitude: float
    longitude: float
    distance_km: Optional[float] = None


class RouteDetail(BaseModel):
    route_id: int
    route_no: str
    route_name: str
    direction: str
    stations: list[RouteStation]
    live_buses: list[LiveBus]


class TripSchedule(BaseModel):
    from_station: str
    to_station: str
    departure_time: str
    arrival_time: str
    travel_time: str
    distance_km: Optional[float] = None


class TransitSearchResult(BaseModel):
    query: str
    routes: list[RouteSuggestion]
    stops: list[StopSuggestion]


class LiveRouteResult(BaseModel):
    route_id: int
    route_no: str
    route_name: str
    up: RouteDetail
    down: Optional[RouteDetail] = None
    fetched_at: datetime


class VehicleTrack(BaseModel):
    vehicle_id: int
    vehicle_number: str
    route_no: str
    latitude: float
    longitude: float
    current_stop: Optional[str] = None
    next_stop: Optional[str] = None
    heading: int
    speed: Optional[float] = None


class VehicleTripResult(BaseModel):
    route_no: str
    vehicle_number: str
    stops: list[dict]
    live_location: Optional[VehicleTrack] = None
