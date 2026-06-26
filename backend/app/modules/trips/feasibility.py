"""
Leg feasibility — keep the manual route planner honest.

`route_planner.plan_route` is a *calculator*: it will compute a confident distance and
time for any transport on any leg. But some legs are physically impossible — an intercity
Metro (metro/tram only runs *inside* a city), a 100 km Flight, walking across a state —
and rendering a precise ETA for them is a lie.

This module draws the line in two tiers:

  - **hard-impossible** legs are rejected (`check_leg_feasibility` returns a reason; the
    route endpoint turns that into a 422), and
  - **possible-but-unusual** legs are allowed but flagged with an "estimate only" note
    (`leg_warning`).

The auto *journey* planner picks modes from distance and routes flights through real OSM
airports, so it never builds an infeasible leg — only the manual planner needs guarding.
That's why validation is wired at the route endpoint, not inside `plan_route` (which both
planners share), and why the airport lookup is injectable so tests stay off the network.
"""

from typing import Awaitable, Callable, Optional

from app.modules.trips.hubs import nearest_airport
from app.modules.trips.route_planner import haversine_km
from app.modules.trips.transport import resolve_transport

# ── Hard limits: beyond these the mode cannot exist for the leg ──────────────────
METRO_MAX_KM = 60.0      # metro/tram serves one metropolitan area, never city-to-city
WALK_MAX_KM = 40.0
BICYCLE_MAX_KM = 200.0
FLIGHT_MIN_KM = 200.0            # shorter than this you go by road/rail, not air
FLIGHT_AIRPORT_RADIUS_KM = 100.0  # a real airport must sit within this of each endpoint

# ── Soft thresholds: allowed, but unusual enough to label as a rough estimate ────
BUS_LONG_KM = 1000.0
ROAD_LONG_KM = 2500.0    # car / motorcycle
TRAIN_LONG_KM = 2500.0

AirportLookup = Callable[[dict], Awaitable[Optional[dict]]]


def _km(origin: dict, destination: dict) -> float:
    return haversine_km(
        origin["latitude"], origin["longitude"], destination["latitude"], destination["longitude"]
    )


async def _no_airport_reason(origin: dict, destination: dict, lookup: AirportLookup) -> Optional[str]:
    """Reason a flight has no usable airport at one end, or None.

    A lookup returning ``None`` (Overpass down / nothing indexed) is treated as "can't
    disprove" — we don't block, since the distance gate already passed, so a network blip
    never spuriously kills a legitimate flight.
    """
    for verb, pt in (("depart from", origin), ("arrive at", destination)):
        hub = await lookup(pt)
        if hub is None:
            continue
        if hub.get("distanceKm", 0.0) > FLIGHT_AIRPORT_RADIUS_KM:
            name = pt.get("name", "this point")
            return (
                f"No airport near {name} to {verb} — the nearest, {hub['name']}, "
                f"is {round(hub['distanceKm'])} km away. Go by road or rail."
            )
    return None


async def check_leg_feasibility(
    origin: dict,
    destination: dict,
    transport: str,
    *,
    airport_lookup: AirportLookup = nearest_airport,
) -> Optional[str]:
    """Return a human-readable reason this leg is impossible, or ``None`` if it's allowed."""
    key, _ = resolve_transport(transport)
    km = _km(origin, destination)

    if key == "METRO" and km > METRO_MAX_KM:
        return (
            f"Metro/tram runs within a city, not {round(km)} km between cities. "
            f"Try train or bus for this leg."
        )
    if key == "WALK" and km > WALK_MAX_KM:
        return f"{round(km)} km is too far to walk."
    if key == "BICYCLE" and km > BICYCLE_MAX_KM:
        return f"{round(km)} km is too far to cycle."
    if key == "FLIGHT":
        if km < FLIGHT_MIN_KM:
            return f"{round(km)} km is too short to fly — go by road or rail."
        return await _no_airport_reason(origin, destination, airport_lookup)
    return None


def leg_warning(origin: dict, destination: dict, transport: str) -> Optional[str]:
    """An 'estimate only' note for a possible-but-unusual leg, or ``None``.

    Notes are prefixed with ⚠️ so the frontend can style them apart from neutral notes.
    """
    key, profile = resolve_transport(transport)
    km = _km(origin, destination)

    if key in ("FERRY", "CRUISE"):
        return (
            f"⚠️ {profile['label']}: we don't verify that a real water route exists here — "
            f"distance and time are a rough estimate."
        )
    if key == "BUS" and km > BUS_LONG_KM:
        return f"⚠️ {round(km)} km is unusually long for a bus — estimate only; a train or flight is more realistic."
    if key in ("CAR", "MOTORCYCLE") and km > ROAD_LONG_KM:
        return f"⚠️ {round(km)} km is a very long drive — estimate only."
    if key == "TRAIN" and km > TRAIN_LONG_KM:
        return f"⚠️ {round(km)} km is a very long rail leg — estimate only."
    return None
