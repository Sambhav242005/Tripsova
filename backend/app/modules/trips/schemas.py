from pydantic import BaseModel, model_validator
from typing import Optional
from uuid import UUID
from datetime import datetime


class TripGenerateRequest(BaseModel):
    destination: str
    # Where the traveller is starting from. Optional: when given we compute the real
    # getting-there leg (route, fuel stops along the way, travel cost) for their mode.
    origin: Optional[str] = None
    days: int
    budget: float
    peopleCount: int
    travelStyle: Optional[list[str]] = None
    dietPreference: Optional[list[str]] = None
    tripType: str
    # Legacy mode (LAND/AIR/WATER) or a transport (CAR/TRAIN/BUS/FLIGHT/FERRY/…).
    travelMode: Optional[str] = "LAND"
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
    travelMode: str = "LAND"
    fuelStops: list = []  # populated only for self-driven petrol transports
    # Present only when an `origin` was supplied: the getting-there leg (origin,
    # destination, transport, distanceKm, durationHours, fuelStops, travelCost, note).
    gettingThere: Optional[dict] = None
    aiGenerated: bool = False
    tripId: Optional[str] = None


class RoutePoint(BaseModel):
    name: str
    latitude: float
    longitude: float


class RouteLeg(BaseModel):
    origin: RoutePoint
    destination: RoutePoint
    # CAR | MOTORCYCLE | TRAIN | BUS | METRO | BICYCLE | WALK | FLIGHT | FERRY | CRUISE
    transport: str = "CAR"


class RoutePlanRequest(BaseModel):
    # Single-leg (legacy) shape:
    origin: Optional[RoutePoint] = None
    destination: Optional[RoutePoint] = None
    travelMode: Optional[str] = None  # LAND/AIR/WATER or a transport key
    transport: Optional[str] = None
    # Multi-leg shape — each leg names its own transport:
    legs: Optional[list[RouteLeg]] = None
    departureTime: Optional[datetime] = None
    # Persistence: attach the computed route to an existing trip, or save it as a
    # new standalone trip. Both are optional — omit to just compute without saving.
    tripId: Optional[str] = None
    save: Optional[bool] = False

    @model_validator(mode="after")
    def _require_a_route(self):
        if not self.legs and not (self.origin and self.destination):
            raise ValueError("Provide either 'legs' or both 'origin' and 'destination'.")
        return self


class RoutePlanResponse(BaseModel):
    travelMode: str          # echoed mode, or "MULTI" for multi-leg journeys
    transport: str = ""      # resolved transport key, or "MULTI"
    medium: str = ""         # LAND | AIR | WATER, or "MIXED"
    origin: dict
    destination: dict
    distanceKm: float
    estimatedDurationHours: float
    departureTime: str
    arrivalTime: str
    legs: list = []          # per-leg summaries (empty list for old clients is fine)
    segments: list
    overnightStops: list
    fuelStops: list
    notes: list
    tripId: Optional[str] = None  # set when the route was saved/attached to a trip


class JourneyPlanRequest(BaseModel):
    """High-level request: the user gives cities and intent; the engine picks the modes."""
    origin: str                       # city name (e.g. "Ratlam")
    destination: str                  # city name (e.g. "Mumbai")
    roundTrip: Optional[bool] = False
    peopleCount: Optional[int] = 1
    budget: Optional[float] = None    # if set, the response flags whether the plan fits
    departureTime: Optional[datetime] = None


class JourneyPlanResponse(BaseModel):
    id: Optional[str] = None          # set when the journey was saved to history
    origin: dict
    destination: dict
    roundTrip: bool
    peopleCount: int
    chosenModes: list                 # transports the engine selected, in order of use
    geocoding: dict                   # how each city name was resolved (db / nominatim)
    cost: dict                        # per-leg + total INR estimate
    budget: Optional[float] = None
    withinBudget: Optional[bool] = None
    route: dict                       # full route_planner output (legs, segments, stops…)


class JourneyRecordResponse(BaseModel):
    """A saved journey, including its status and (when ready) the full result."""
    id: str
    origin: str
    destination: str
    roundTrip: bool
    peopleCount: int
    budget: Optional[float] = None
    status: str                       # pending | ready | failed
    result: Optional[dict] = None
    error: Optional[str] = None
    createdAt: datetime


class JourneyListItem(BaseModel):
    """Lightweight history row (no full route payload)."""
    id: str
    origin: str
    destination: str
    roundTrip: bool
    peopleCount: int
    status: str
    total: Optional[float] = None
    chosenModes: list = []
    createdAt: datetime


class TripResponse(BaseModel):
    id: UUID
    user_id: UUID
    destination_id: Optional[UUID] = None
    title: Optional[str] = None
    trip_type: Optional[str] = None
    days: Optional[int] = None
    budget: Optional[float] = None
    people_count: Optional[int] = None
    # Stored as a list (e.g. ["nature"]) by the trip builder; older rows may hold a dict.
    travel_style: Optional[list | dict] = None
    diet_preference: Optional[list | dict] = None
    start_date: Optional[datetime] = None
    offline_required: bool
    generated_plan: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
