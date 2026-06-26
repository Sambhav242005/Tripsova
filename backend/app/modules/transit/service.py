import logging
from datetime import datetime, timezone
from typing import Optional

from app.modules.transit.bmtc_provider import BMTCProvider, BMTCApiError

logger = logging.getLogger("tripsova.transit")

# In-process cache — BMTC data changes infrequently for static endpoints.
_search_cache: dict[str, tuple[float, list[dict]]] = {}
_all_routes_cache: tuple[float, list[dict]] = (0.0, [])
CACHE_TTL = 120  # seconds


def _cache_get(key: str) -> Optional[list[dict]]:
    entry = _search_cache.get(key)
    if entry and (datetime.now(timezone.utc).timestamp() - entry[0]) < CACHE_TTL:
        return entry[1]
    if key in _search_cache:
        del _search_cache[key]
    return None


def _cache_set(key: str, data: list[dict]) -> None:
    _search_cache[key] = (datetime.now(timezone.utc).timestamp(), data)


async def search_transit(query: str, provider: BMTCProvider) -> dict:
    """Search both routes and stops, returning matching results."""
    routes: list[dict] = []
    stops: list[dict] = []

    cache_key = f"routes:{query.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        routes = cached
    else:
        try:
            routes = await provider.search_routes(query)
            _cache_set(cache_key, routes)
        except BMTCApiError:
            logger.warning("BMTC route search failed for %s", query)

    cache_key = f"stops:{query.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        stops = cached
    else:
        try:
            stops = await provider.search_stops(query)
            _cache_set(cache_key, stops)
        except BMTCApiError:
            logger.warning("BMTC stop search failed for %s", query)

    return {
        "query": query,
        "routes": [
            {"route_id": r.get("routeparentid") or r.get("routeid"), "route_no": r.get("routeno"), "route_name": r.get("routename")}
            for r in routes
        ],
        "stops": [
            {"station_id": entry.get("routeid") or entry.get("srno"), "station_name": entry.get("routename") or entry.get("stationName"), "latitude": entry.get("center_lat") or entry.get("latitude") or 0, "longitude": entry.get("center_lon") or entry.get("longitude") or 0}
            for entry in stops
        ],
    }


async def get_live_route(route_parent_id: int, provider: BMTCProvider) -> Optional[dict]:
    """Get live bus positions and stations for a route."""
    try:
        data = await provider.get_route_details(route_parent_id)
    except BMTCApiError:
        logger.warning("BMTC route details failed for %s", route_parent_id)
        return None

    route_no = ""
    route_name = ""
    up_stations: list[dict] = []
    up_buses: list[dict] = []
    down_stations: list[dict] = []
    down_buses: list[dict] = []

    up_raw = data.get("up") or {}
    down_raw = data.get("down") or {}

    for entry in up_raw.get("data") or []:
        if not route_no:
            route_no = entry.get("routeno") or ""
        if not route_name:
            route_name = f"{entry.get('from', '')} → {entry.get('to', '')}"
        up_stations.append({
            "station_id": entry.get("stationid"),
            "station_name": entry.get("stationname"),
            "latitude": entry.get("centerlat") or 0,
            "longitude": entry.get("centerlong") or 0,
        })
        for v in entry.get("vehicleDetails") or []:
            up_buses.append({
                "vehicle_id": v.get("vehicleid"),
                "vehicle_number": v.get("vehiclenumber"),
                "latitude": v.get("centerlat") or 0,
                "longitude": v.get("centerlong") or 0,
                "heading": v.get("heading") or 0,
                "eta": v.get("eta"),
                "service_type": v.get("servicetype"),
                "last_refresh": v.get("lastrefreshon"),
            })

    for entry in down_raw.get("data") or []:
        if not route_no:
            route_no = entry.get("routeno") or ""
        if not route_name:
            route_name = f"{entry.get('from', '')} → {entry.get('to', '')}"
        down_stations.append({
            "station_id": entry.get("stationid"),
            "station_name": entry.get("stationname"),
            "latitude": entry.get("centerlat") or 0,
            "longitude": entry.get("centerlong") or 0,
        })
        for v in entry.get("vehicleDetails") or []:
            down_buses.append({
                "vehicle_id": v.get("vehicleid"),
                "vehicle_number": v.get("vehiclenumber"),
                "latitude": v.get("centerlat") or 0,
                "longitude": v.get("centerlong") or 0,
                "heading": v.get("heading") or 0,
                "eta": v.get("eta"),
                "service_type": v.get("servicetype"),
                "last_refresh": v.get("lastrefreshon"),
            })

    return {
        "route_id": route_parent_id,
        "route_no": route_no,
        "route_name": route_name,
        "up": {
            "stations": up_stations,
            "live_buses": up_buses,
        },
        "down": {
            "stations": down_stations,
            "live_buses": down_buses,
        } if down_stations else None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def track_vehicle(vehicle_id: int, provider: BMTCProvider) -> Optional[dict]:
    """Live track a specific BMTC bus."""
    try:
        data = await provider.get_vehicle_trip(vehicle_id)
    except BMTCApiError:
        logger.warning("BMTC vehicle track failed for %s", vehicle_id)
        return None

    route_details = data.get("RouteDetails") or []
    live_location = data.get("LiveLocation")

    track = None
    if live_location:
        loc = live_location[0] if isinstance(live_location, list) else live_location
        track = {
            "vehicle_id": loc.get("vehicleid"),
            "vehicle_number": loc.get("vehiclenumber"),
            "route_no": loc.get("routeno"),
            "latitude": loc.get("latitude") or 0,
            "longitude": loc.get("longitude") or 0,
            "current_stop": loc.get("previousstop"),
            "next_stop": loc.get("nextstop"),
            "heading": loc.get("heading") or 0,
        }

    return {
        "route_no": route_details[0].get("routeno") if route_details else "",
        "vehicle_number": route_details[0].get("busno") if route_details else "",
        "stops": [
            {
                "station_id": s.get("stationid"),
                "station_name": s.get("stationname"),
                "latitude": s.get("latitude") or 0,
                "longitude": s.get("longitude") or 0,
                "scheduled_arrival": s.get("sch_arrivaltime"),
                "actual_arrival": s.get("actual_arrivaltime1"),
                "eta": s.get("etastatus"),
            }
            for s in route_details
        ],
        "live_location": track,
    }
