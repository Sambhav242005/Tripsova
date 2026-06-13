"""
Tripsova Route Planner.

Plans a journey made of one or more **legs**, where each leg names a **transport**
(car, train, bus, flight, ferry, …). Each leg is processed with its transport's
behavioural profile (see transport.py):

  - Self-driven road legs (car, motorcycle, bicycle, walk) are broken into driving
    days: travel pauses at DAY_END (~20:00), produces an overnight stop with the
    nearest city + real hotel options + the traveller's choices (book hotel / stay
    with relatives / keep going), then resumes at DAY_START (08:00). Petrol vehicles
    additionally get fuel stops every fuel_interval_km.
  - Scheduled / onboard-sleep legs (train, bus, flight, ferry, cruise) are a single
    continuous segment — no fuel, no overnight road stop. You sleep on board or arrive
    the same day.

Legs are chained on a continuous clock: each leg departs when the previous one arrives.
Every segment, overnight stop and fuel stop carries coordinates + ISO timestamps so the
frontend can draw the whole journey on a map with one timeline.

Backwards compatible: a request with a single {origin, destination, travelMode} (no
`legs`) still works and returns the original single-leg response shape.
"""

from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.trips.transport import (
    DEFAULT_FUEL_INTERVAL_KM,
    echo_mode,
    resolve_transport,
)

DAY_START_HOUR = 8    # resume driving in the morning
DAY_END_HOUR = 20     # stop for the night by this hour
MAX_DRIVE_HOURS_PER_DAY = 9.0
FUEL_INTERVAL_KM = DEFAULT_FUEL_INTERVAL_KM  # default car tank range; kept for callers/tests


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, (lat1, lng1, lat2, lng2))
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 6371.0 * 2 * asin(sqrt(a))


def _interpolate(origin: dict, destination: dict, fraction: float) -> dict:
    """Point at `fraction` of the way along the straight line origin→destination."""
    fraction = max(0.0, min(1.0, fraction))
    return {
        "latitude": round(origin["latitude"] + (destination["latitude"] - origin["latitude"]) * fraction, 5),
        "longitude": round(origin["longitude"] + (destination["longitude"] - origin["longitude"]) * fraction, 5),
    }


def _parse_departure(value) -> datetime:
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str) and value:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        # Default: tomorrow at DAY_START so the first driving day is a full one.
        now = datetime.now(timezone.utc)
        dt = (now + timedelta(days=1)).replace(hour=DAY_START_HOUR, minute=0, second=0, microsecond=0)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def _all_destinations_with_coords(db: Optional[AsyncSession]) -> list:
    if db is None:
        return []
    result = await db.execute(
        select(Destination).where(
            Destination.latitude.is_not(None),
            Destination.longitude.is_not(None),
        )
    )
    return list(result.scalars().all())


def _nearest_destination(destinations: list, point: dict) -> Optional[Destination]:
    if not destinations:
        return None
    return min(
        destinations,
        key=lambda d: haversine_km(point["latitude"], point["longitude"], d.latitude, d.longitude),
    )


def _city_dict(city: Optional[Destination], point: dict) -> Optional[dict]:
    if city is None:
        return None
    return {
        "id": str(city.id),
        "name": city.name,
        "city": city.city,
        "state": city.state,
        "latitude": city.latitude,
        "longitude": city.longitude,
        "distanceFromRouteKm": round(
            haversine_km(point["latitude"], point["longitude"], city.latitude, city.longitude), 1
        ),
    }


async def _hotel_options(db: Optional[AsyncSession], city: Optional[Destination]) -> list[dict]:
    """Real bookable stays (HOTEL/HOMESTAY) in the overnight city, best first."""
    if db is None or city is None:
        return []
    result = await db.execute(
        select(Place)
        .where(Place.destination_id == city.id, Place.type.in_(("HOTEL", "HOMESTAY")))
        .order_by(Place.tripova_score.desc())
        .limit(5)
    )
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "type": p.type,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "phone": p.phone,
            "address": p.address,
            "price_range": p.price_range,
            "external_rating": p.external_rating,
        }
        for p in result.scalars().all()
    ]


def _stop_options(city: Optional[dict], hotels: list[dict]) -> list[dict]:
    where = f" in {city['name']}" if city else " nearby"
    return [
        {"type": "BOOK_HOTEL", "label": f"Book a hotel{where}", "hotels": hotels},
        {"type": "STAY_WITH_RELATIVES", "label": "Stay with friends or relatives who live nearby"},
        {"type": "CONTINUE", "label": "Keep travelling through the night (not recommended)"},
    ]


def _time_at_km(timeline: list, km: float) -> Optional[str]:
    """Linear-interpolated clock time at which `km` of the leg is reached."""
    for start_km, end_km, start_t, end_t in timeline:
        if start_km <= km <= end_km and end_km > start_km:
            frac = (km - start_km) / (end_km - start_km)
            return (start_t + (end_t - start_t) * frac).isoformat()
    return None


async def _plan_leg(db, destinations, origin, destination, key, profile, start_dt, leg_index) -> dict:
    """Plan one leg. Returns segments / overnight stops / fuel stops / a summary,
    all on a clock that begins at `start_dt`."""
    medium, label, icon = profile["medium"], profile["label"], profile["icon"]
    straight_km = haversine_km(
        origin["latitude"], origin["longitude"], destination["latitude"], destination["longitude"]
    )
    distance_km = straight_km * profile["route_factor"]
    speed = profile["speed_kmh"] or 1.0
    drive_hours = distance_km / speed
    overhead = profile["overhead_hours"]
    travel_hours = drive_hours + overhead

    base_summary = {
        "legIndex": leg_index,
        "transport": key,
        "medium": medium,
        "label": label,
        "icon": icon,
        "from": origin,
        "to": destination,
        "distanceKm": round(distance_km, 1),
    }

    # ── Scheduled / onboard-sleep: a single continuous segment ───────────────
    if not profile["overnight_rest"]:
        depart = start_dt
        arrive = depart + timedelta(hours=travel_hours)
        segment = {
            "legIndex": leg_index,
            "transport": key,
            "medium": medium,
            "day": 1,
            "startTime": depart.isoformat(),
            "endTime": arrive.isoformat(),
            "startPoint": _interpolate(origin, destination, 0.0),
            "endPoint": _interpolate(origin, destination, 1.0),
            "distanceKm": round(distance_km, 1),
            "travelHours": round(travel_hours, 1),
        }
        note = f"{icon} {label}: continuous {medium.lower()} leg — refuelling and overnight road stops don't apply."
        summary = {**base_summary, "departureTime": depart.isoformat(),
                   "arrivalTime": arrive.isoformat(), "durationHours": round(travel_hours, 1)}
        return {
            "segments": [segment], "overnightStops": [], "fuelStops": [],
            "distanceKm": distance_km, "travelHours": travel_hours,
            "arrival": arrive, "notes": [note], "summary": summary,
        }

    # ── Self-driven road leg: simulate driving days with overnight pauses ─────
    current = start_dt + timedelta(hours=overhead)
    covered_km = 0.0
    remaining_hours = drive_hours
    day = 1
    segments: list[dict] = []
    overnight_stops: list[dict] = []
    timeline: list[tuple] = []  # (start_km, end_km, start_t, end_t)

    async def _make_overnight(stop_point, arrival_dt):
        city = _nearest_destination(destinations, stop_point)
        city_info = _city_dict(city, stop_point)
        hotels = await _hotel_options(db, city)
        resume = (arrival_dt + timedelta(days=1)).replace(
            hour=DAY_START_HOUR, minute=0, second=0, microsecond=0
        )
        overnight_stops.append({
            "legIndex": leg_index,
            "transport": key,
            "day": day,
            "arrivalTime": arrival_dt.isoformat(),
            "resumeTime": resume.isoformat(),
            "location": stop_point,
            "nearestCity": city_info,
            "options": _stop_options(city_info, hotels),
        })
        return resume

    while remaining_hours > 1e-9:
        end_of_day = current.replace(hour=DAY_END_HOUR, minute=0, second=0, microsecond=0)
        available_hours = min((end_of_day - current).total_seconds() / 3600.0, MAX_DRIVE_HOURS_PER_DAY)

        if available_hours <= 0:
            # Started too late in the evening — rest first, drive tomorrow.
            stop_point = _interpolate(origin, destination, covered_km / distance_km if distance_km else 0)
            current = await _make_overnight(stop_point, current)
            day += 1
            continue

        leg_hours = min(available_hours, remaining_hours)
        leg_km = leg_hours * speed
        start_frac = covered_km / distance_km if distance_km else 0
        leg_start_km = covered_km
        covered_km = min(covered_km + leg_km, distance_km)
        end_frac = covered_km / distance_km if distance_km else 1
        leg_end = current + timedelta(hours=leg_hours)

        segments.append({
            "legIndex": leg_index,
            "transport": key,
            "medium": medium,
            "day": day,
            "startTime": current.isoformat(),
            "endTime": leg_end.isoformat(),
            "startPoint": _interpolate(origin, destination, start_frac),
            "endPoint": _interpolate(origin, destination, end_frac),
            "distanceKm": round(leg_km, 1),
            "travelHours": round(leg_hours, 1),
        })
        timeline.append((leg_start_km, covered_km, current, leg_end))
        remaining_hours -= leg_hours
        current = leg_end

        if remaining_hours > 1e-9:
            stop_point = _interpolate(origin, destination, end_frac)
            current = await _make_overnight(stop_point, current)
            day += 1

    arrival = datetime.fromisoformat(segments[-1]["endTime"]) if segments else start_dt

    fuel_stops = []
    if profile["refuel"]:
        interval = profile.get("fuel_interval_km", DEFAULT_FUEL_INTERVAL_KM)
        km = interval
        while km < distance_km:
            fuel_stops.append({
                "legIndex": leg_index,
                "atKm": round(km, 1),
                "location": _interpolate(origin, destination, km / distance_km),
                "estimatedTime": _time_at_km(timeline, km),
            })
            km += interval

    notes = []
    if overnight_stops:
        notes.append(
            f"{icon} {label}: {len(overnight_stops)} overnight stop(s) — driving pauses around "
            f"{DAY_END_HOUR}:00 and resumes at {DAY_START_HOUR:02d}:00."
        )
    if fuel_stops:
        notes.append(f"{icon} {label}: refuel roughly every {int(profile.get('fuel_interval_km', DEFAULT_FUEL_INTERVAL_KM))} km.")

    summary = {**base_summary, "departureTime": start_dt.isoformat(),
               "arrivalTime": arrival.isoformat(), "durationHours": round(travel_hours, 1)}
    return {
        "segments": segments, "overnightStops": overnight_stops, "fuelStops": fuel_stops,
        "distanceKm": distance_km, "travelHours": travel_hours,
        "arrival": arrival, "notes": notes, "summary": summary,
    }


def _normalize_legs(data: dict) -> list[dict]:
    """Accept either a multi-leg request (`legs`) or a single-leg legacy request
    (`origin` + `destination` + `travelMode`/`transport`). Returns a list of
    {origin, destination, transport}."""
    if data.get("legs"):
        legs = []
        for leg in data["legs"]:
            legs.append({
                "origin": leg.get("origin") or leg.get("from"),
                "destination": leg.get("destination") or leg.get("to"),
                "transport": leg.get("transport") or leg.get("mode") or "CAR",
            })
        return legs
    return [{
        "origin": data["origin"],
        "destination": data["destination"],
        "transport": data.get("transport") or data.get("travelMode") or "CAR",
    }]


async def plan_route(db: Optional[AsyncSession], data: dict) -> dict:
    legs_input = _normalize_legs(data)
    departure = _parse_departure(data.get("departureTime"))
    destinations = await _all_destinations_with_coords(db)

    leg_summaries: list[dict] = []
    all_segments: list[dict] = []
    all_overnight: list[dict] = []
    all_fuel: list[dict] = []
    notes: list[str] = []
    total_distance = 0.0
    total_travel_hours = 0.0

    cursor = departure
    for i, leg in enumerate(legs_input):
        key, profile = resolve_transport(leg["transport"])
        r = await _plan_leg(db, destinations, leg["origin"], leg["destination"], key, profile, cursor, i)
        leg_summaries.append(r["summary"])
        all_segments += r["segments"]
        all_overnight += r["overnightStops"]
        all_fuel += r["fuelStops"]
        notes += r["notes"]
        total_distance += r["distanceKm"]
        total_travel_hours += r["travelHours"]
        cursor = r["arrival"]  # next leg departs when this one arrives

    arrival = cursor
    multi = len(legs_input) > 1
    first_origin = legs_input[0]["origin"]
    last_destination = legs_input[-1]["destination"]

    if multi:
        travel_mode = "MULTI"
        transport = "MULTI"
        medium = "MIXED"
    else:
        travel_mode = echo_mode(data.get("travelMode") or legs_input[0]["transport"])
        key, profile = resolve_transport(legs_input[0]["transport"])
        transport = key
        medium = profile["medium"]

    return {
        "travelMode": travel_mode,
        "transport": transport,
        "medium": medium,
        "origin": first_origin,
        "destination": last_destination,
        "distanceKm": round(total_distance, 1),
        "estimatedDurationHours": round(total_travel_hours, 1),
        "departureTime": departure.isoformat(),
        "arrivalTime": arrival.isoformat(),
        "legs": leg_summaries,
        "segments": all_segments,
        "overnightStops": all_overnight,
        "fuelStops": all_fuel,
        "notes": notes,
    }
