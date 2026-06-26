"""
Transport hubs for automatic multi-leg routing — sourced live from OpenStreetMap.

Real journeys don't start at a city centre and teleport — you go to a fixed *hub* and
travel between hubs:

  - to FLY, you go to the nearest major **airport**, fly, then travel in from the
    arrival airport;
  - to take a TRAIN, you go to the nearest major **railway station**, ride
    station→station, then travel in from the arrival station.

So the journey planner snaps air legs to airports and rail legs to stations, using the
hub's real coordinates (not the city centre's). Rather than ship a hand-written list of a
few cities' hubs, we ask **OpenStreetMap** (via the Overpass API) for the nearest real
airport / station to any coordinate — so this works for any city, anywhere, with no
maintained dataset. Results are cached in-process (keyed on rounded coordinates) so we
don't re-hit the network for the same area, and every lookup degrades gracefully: if
Overpass is unreachable or has no hub nearby, the function returns ``None`` and the planner
falls back to a direct ground leg.

Each hub's name carries its IATA / station code (from OSM tags) when available, so the
traveller sees exactly which hub they're routed through.
"""

import logging
from math import asin, cos, radians, sin, sqrt
from typing import Callable, Optional

logger = logging.getLogger("tripsova.hubs")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
_USER_AGENT = "Tripsova/1.0 (trip planner; contact: support@tripsova.app)"

# How far to look for the nearest hub of each kind (metres). Airports are sparse and you
# may legitimately drive a long way to one; stations are dense, so a tighter radius keeps
# us from snapping to one a state away when something closer exists.
_AIRPORT_RADIUS_M = 400_000
_STATION_RADIUS_M = 150_000

# Overpass selectors. Airports: aerodromes that carry an IATA code — that filters the
# thousands of airstrips down to the ones with scheduled passenger service. Stations:
# mainline railway stations, excluding metro/tram/monorail so we don't route an
# intercity train through a subway stop.
_AIRPORT_SELECTOR = '["aeroway"="aerodrome"]["iata"]'
_STATION_SELECTOR = '["railway"="station"]["station"!~"subway|light_rail|monorail|tram"]'

# (kind, round(lat,2), round(lng,2)) -> base hub dict {name,latitude,longitude} or None.
_CACHE: dict[tuple, Optional[dict]] = {}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, (lat1, lng1, lat2, lng2))
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 6371.0 * 2 * asin(sqrt(a))


def _with_distance(hub: Optional[dict], point: dict) -> Optional[dict]:
    """Attach `distanceKm` from `point` to a base hub dict (or pass through None)."""
    if hub is None:
        return None
    return {
        **hub,
        "distanceKm": round(
            _haversine_km(point["latitude"], point["longitude"], hub["latitude"], hub["longitude"]), 1
        ),
    }


async def _overpass(query: str) -> list[dict]:
    """Run an Overpass query, returning its `elements` (empty list on any failure)."""
    import httpx

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                OVERPASS_URL, data={"data": query}, headers={"User-Agent": _USER_AGENT}
            )
        if resp.status_code >= 400:
            logger.warning("Overpass HTTP %s", resp.status_code)
            return []
        return resp.json().get("elements", [])
    except Exception:
        logger.exception("Overpass query failed")
        return []


def _element_coords(el: dict) -> Optional[tuple[float, float]]:
    """Pull (lat, lng) from a node (lat/lon) or a way/relation (center)."""
    if el.get("lat") is not None and el.get("lon") is not None:
        return el["lat"], el["lon"]
    center = el.get("center")
    if center:
        return center["lat"], center["lon"]
    return None


def _airport_name(tags: dict) -> Optional[str]:
    name = tags.get("name:en") or tags.get("name")
    if not name:
        return None
    iata = tags.get("iata")
    return f"{name} ({iata})" if iata else name


def _station_name(tags: dict) -> Optional[str]:
    name = tags.get("name:en") or tags.get("name")
    if not name:
        return None
    code = tags.get("railway:ref") or tags.get("ref")
    return f"{name} ({code})" if code else name


async def _nearest_osm(
    point: Optional[dict],
    kind: str,
    selector: str,
    radius_m: int,
    name_of: Callable[[dict], Optional[str]],
) -> Optional[dict]:
    """Nearest OSM hub of `kind` to a {latitude, longitude} point, `distanceKm` attached.

    Returns None when the point is unusable, Overpass fails, or nothing matches nearby —
    callers treat that as "no hub" and fall back to a direct ground leg.
    """
    if point is None or point.get("latitude") is None or point.get("longitude") is None:
        return None

    lat, lng = point["latitude"], point["longitude"]
    ckey = (kind, round(lat, 2), round(lng, 2))
    if ckey in _CACHE:
        return _with_distance(_CACHE[ckey], point)

    query = (
        "[out:json][timeout:25];("
        + "".join(
            f"{etype}{selector}(around:{radius_m},{lat},{lng});"
            for etype in ("node", "way", "relation")
        )
        + ");out center;"
    )
    elements = await _overpass(query)

    best: Optional[dict] = None
    best_km: Optional[float] = None
    for el in elements:
        coords = _element_coords(el)
        if coords is None:
            continue
        name = name_of(el.get("tags", {}))
        if not name:
            continue
        km = _haversine_km(lat, lng, coords[0], coords[1])
        if best_km is None or km < best_km:
            best_km, best = km, {"name": name, "latitude": coords[0], "longitude": coords[1]}

    _CACHE[ckey] = best
    return _with_distance(best, point)


async def nearest_airport(point: dict) -> Optional[dict]:
    """Closest commercial airport to a {latitude, longitude} point, from OpenStreetMap."""
    return await _nearest_osm(point, "airport", _AIRPORT_SELECTOR, _AIRPORT_RADIUS_M, _airport_name)


async def nearest_station(point: dict) -> Optional[dict]:
    """Closest mainline railway station to a {latitude, longitude} point, from OpenStreetMap."""
    return await _nearest_osm(point, "station", _STATION_SELECTOR, _STATION_RADIUS_M, _station_name)
