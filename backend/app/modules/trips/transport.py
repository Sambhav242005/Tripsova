"""
Transport catalog for Tripsova.

Each transport carries a *behavioural* profile, not just a speed. Two flags drive
how the route planner treats a leg:

  - refuel:          the traveller stops to refuel. Only self-driven petrol
                     vehicles (car, motorcycle). A train passenger never refuels.
  - overnight_rest:  the journey pauses overnight for the traveller to sleep OFF
                     the vehicle (self-driven road travel). Scheduled / onboard-sleep
                     transports (train, bus, flight, ferry, cruise) run as one
                     continuous segment instead — you sleep on board or arrive same day.

`medium` (LAND / AIR / WATER) is kept only for icons and the "never refuel mid-air"
sanity check; it is NOT what the engine branches on.
"""

DEFAULT_FUEL_INTERVAL_KM = 450.0
DEFAULT_TRANSPORT = "CAR"

# Old coarse modes map onto a representative transport so existing callers keep working.
LEGACY_MODE_ALIASES = {"LAND": "CAR", "AIR": "FLIGHT", "WATER": "FERRY"}

# Cost fields (rough INR estimates for travel in India, 2026):
#   cost_per_km / base_fare  — fare model for that transport
#   per_vehicle              — True for self-owned vehicles whose cost is shared by the
#                              whole party (car/bike), False for ticketed transport that
#                              charges each traveller (train/flight/…)
#   seats                    — capacity used to size the number of vehicles for per_vehicle modes
TRANSPORT_PROFILES = {
    "CAR":        {"medium": "LAND",  "speed_kmh": 50.0,  "route_factor": 1.25, "overhead_hours": 0.5,  "refuel": True,  "overnight_rest": True,  "scheduled": False, "fuel_interval_km": 450.0, "label": "Car",          "icon": "🚗",  "cost_per_km": 9.0,  "base_fare": 0.0,    "per_vehicle": True,  "seats": 4},
    "MOTORCYCLE": {"medium": "LAND",  "speed_kmh": 45.0,  "route_factor": 1.25, "overhead_hours": 0.4,  "refuel": True,  "overnight_rest": True,  "scheduled": False, "fuel_interval_km": 250.0, "label": "Motorcycle",   "icon": "🏍️", "cost_per_km": 3.0,  "base_fare": 0.0,    "per_vehicle": True,  "seats": 2},
    "TRAIN":      {"medium": "LAND",  "speed_kmh": 80.0,  "route_factor": 1.15, "overhead_hours": 0.75, "refuel": False, "overnight_rest": False, "scheduled": True,  "label": "Train",        "icon": "🚆",  "cost_per_km": 1.3,  "base_fare": 40.0,   "per_vehicle": False, "seats": 1},
    "BUS":        {"medium": "LAND",  "speed_kmh": 45.0,  "route_factor": 1.20, "overhead_hours": 0.5,  "refuel": False, "overnight_rest": False, "scheduled": True,  "label": "Bus",          "icon": "🚌",  "cost_per_km": 1.6,  "base_fare": 30.0,   "per_vehicle": False, "seats": 1},
    "METRO":      {"medium": "LAND",  "speed_kmh": 30.0,  "route_factor": 1.10, "overhead_hours": 0.2,  "refuel": False, "overnight_rest": False, "scheduled": True,  "label": "Metro / Tram", "icon": "🚇",  "cost_per_km": 1.0,  "base_fare": 10.0,   "per_vehicle": False, "seats": 1},
    "BICYCLE":    {"medium": "LAND",  "speed_kmh": 15.0,  "route_factor": 1.30, "overhead_hours": 0.1,  "refuel": False, "overnight_rest": True,  "scheduled": False, "label": "Bicycle",      "icon": "🚲",  "cost_per_km": 0.0,  "base_fare": 0.0,    "per_vehicle": True,  "seats": 1},
    "WALK":       {"medium": "LAND",  "speed_kmh": 5.0,   "route_factor": 1.30, "overhead_hours": 0.0,  "refuel": False, "overnight_rest": True,  "scheduled": False, "label": "Walking",      "icon": "🚶",  "cost_per_km": 0.0,  "base_fare": 0.0,    "per_vehicle": True,  "seats": 1},
    "FLIGHT":     {"medium": "AIR",   "speed_kmh": 750.0, "route_factor": 1.05, "overhead_hours": 2.5,  "refuel": False, "overnight_rest": False, "scheduled": True,  "label": "Flight",       "icon": "✈️", "cost_per_km": 5.0,  "base_fare": 1800.0, "per_vehicle": False, "seats": 1},
    "FERRY":      {"medium": "WATER", "speed_kmh": 35.0,  "route_factor": 1.15, "overhead_hours": 1.0,  "refuel": False, "overnight_rest": False, "scheduled": True,  "label": "Ferry",        "icon": "⛴️", "cost_per_km": 2.5,  "base_fare": 50.0,   "per_vehicle": False, "seats": 1},
    "CRUISE":     {"medium": "WATER", "speed_kmh": 40.0,  "route_factor": 1.10, "overhead_hours": 1.5,  "refuel": False, "overnight_rest": False, "scheduled": True,  "label": "Cruise",       "icon": "🛳️", "cost_per_km": 10.0, "base_fare": 400.0,  "per_vehicle": False, "seats": 1},
}


def is_known(name: str) -> bool:
    """True if the string is a valid transport key or legacy mode (LAND/AIR/WATER)."""
    key = (name or "").strip().upper()
    return key in TRANSPORT_PROFILES or key in LEGACY_MODE_ALIASES


def resolve_transport(name: str):
    """Return (canonical_key, profile) for a transport or legacy-mode string.

    Unknown values fall back to CAR so the planner always has a usable profile.
    """
    key = (name or "").strip().upper()
    key = LEGACY_MODE_ALIASES.get(key, key)
    if key not in TRANSPORT_PROFILES:
        key = DEFAULT_TRANSPORT
    return key, TRANSPORT_PROFILES[key]


def echo_mode(name: str) -> str:
    """The mode string to echo back to the caller: valid input as-is, else 'LAND'."""
    key = (name or "LAND").strip().upper()
    if key in TRANSPORT_PROFILES or key in LEGACY_MODE_ALIASES:
        return key
    return "LAND"


from math import ceil


def leg_cost(transport: str, distance_km: float, people: int) -> float:
    """Estimated INR cost for a party of `people` to travel `distance_km` by `transport`.

    Ticketed transport (train/flight/…) charges every traveller; self-owned vehicles
    (car/bike) charge once per vehicle and seat `seats` people each. Estimate only.
    """
    _, profile = resolve_transport(transport)
    fare = profile["base_fare"] + profile["cost_per_km"] * max(0.0, distance_km)
    if profile["per_vehicle"]:
        vehicles = max(1, ceil(max(1, people) / profile["seats"]))
        return round(fare * vehicles, 2)
    return round(fare * max(1, people), 2)
