import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.transit.bmtc_provider import BMTCProvider, BMTCApiError
from app.modules.transit.service import get_live_route, search_transit, track_vehicle

logger = logging.getLogger("tripsova.transit")

router = APIRouter(prefix="/api/transit", tags=["transit"])

# Singleton provider: BMTCProvider wraps a single httpx.AsyncClient reused
# across all requests in the process lifetime. Created lazily on first access.
_BMTC_PROVIDER: BMTCProvider | None = None


async def get_provider() -> BMTCProvider:
    global _BMTC_PROVIDER
    if _BMTC_PROVIDER is None:
        _BMTC_PROVIDER = BMTCProvider()
    return _BMTC_PROVIDER


@router.get("/search")
async def transit_search(
    q: str = Query(..., min_length=1, description="Route number or stop name"),
    provider: BMTCProvider = Depends(get_provider),
):
    """Search BMTC routes and stops by name/number."""
    try:
        result = await search_transit(q, provider)
        if not result["routes"] and not result["stops"]:
            raise HTTPException(404, f"No BMTC routes or stops match '{q}'.")
        return result
    except BMTCApiError as e:
        raise HTTPException(502, f"BMTC API unavailable: {e}")


@router.get("/routes/{route_id}")
async def route_live(
    route_id: int,
    provider: BMTCProvider = Depends(get_provider),
):
    """Get live bus positions and station list for a BMTC route.

    ``route_id`` is the ``routeparentid`` from the search endpoint.
    """
    result = await get_live_route(route_id, provider)
    if result is None:
        raise HTTPException(502, "Could not fetch route data from BMTC.")
    return result


@router.get("/vehicle/{vehicle_id}")
async def vehicle_track(
    vehicle_id: int,
    provider: BMTCProvider = Depends(get_provider),
):
    """Live tracking data for a specific BMTC bus."""
    result = await track_vehicle(vehicle_id, provider)
    if result is None:
        raise HTTPException(502, "Could not fetch vehicle data from BMTC.")
    return result


@router.get("/all-routes")
async def all_routes(
    provider: BMTCProvider = Depends(get_provider),
):
    """List all BMTC routes (cached ~2 min)."""
    try:
        route_list = await provider.get_all_routes()
        return {
            "count": len(route_list),
            "routes": [
                {
                    "route_id": r.get("routeid"),
                    "route_no": r.get("routeno"),
                    "route_name": r.get("routename"),
                    "from_station": r.get("fromstation"),
                    "to_station": r.get("tostation"),
                }
                for r in route_list
            ],
        }
    except BMTCApiError as e:
        raise HTTPException(502, f"BMTC API unavailable: {e}")
