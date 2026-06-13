"""
City geocoding for the journey planner.

A user types a city name ("Ratlam"); the engine needs coordinates. Resolution order:
  1. Our own Destination table (already-seeded cities — no network, authoritative).
  2. OpenStreetMap Nominatim (free, covers any town; India-biased by countrycodes=in).

Results are cached in-process so repeated lookups (and round trips) don't re-hit the network.
Nominatim's usage policy requires a descriptive User-Agent and ~1 req/sec; our caching keeps
us well under that for normal use.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination

logger = logging.getLogger("tripsova.geocode")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_USER_AGENT = "Tripsova/1.0 (trip planner; contact: support@tripsova.app)"

# name(lower) -> {name, latitude, longitude, source}
_CACHE: dict[str, dict] = {}


class GeocodeError(Exception):
    """Raised when a city name cannot be resolved to coordinates."""


async def _from_db(db: Optional[AsyncSession], name: str) -> Optional[dict]:
    if db is None:
        return None
    result = await db.execute(
        select(Destination).where(
            Destination.name.ilike(f"%{name}%"),
            Destination.latitude.is_not(None),
            Destination.longitude.is_not(None),
        )
    )
    dest = result.scalars().first()
    if dest is None:
        return None
    return {"name": dest.name, "latitude": dest.latitude, "longitude": dest.longitude, "source": "db"}


async def _from_nominatim(name: str) -> Optional[dict]:
    import httpx

    params = {"q": name, "format": "json", "limit": 1, "countrycodes": "in"}
    headers = {"User-Agent": _USER_AGENT}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
        if resp.status_code >= 400:
            logger.warning("Nominatim HTTP %s for '%s'", resp.status_code, name)
            return None
        hits = resp.json()
    except Exception:
        logger.exception("Nominatim lookup failed for '%s'", name)
        return None
    if not hits:
        return None
    hit = hits[0]
    return {
        "name": hit.get("display_name", name).split(",")[0].strip() or name,
        "latitude": float(hit["lat"]),
        "longitude": float(hit["lon"]),
        "source": "nominatim",
    }


async def geocode_city(db: Optional[AsyncSession], name: str) -> dict:
    """Resolve a city name to {name, latitude, longitude, source}. Raises GeocodeError if unknown."""
    key = (name or "").strip().lower()
    if not key:
        raise GeocodeError("Empty city name")
    if key in _CACHE:
        return _CACHE[key]

    point = await _from_db(db, name) or await _from_nominatim(name)
    if point is None:
        raise GeocodeError(f"Could not locate '{name}'. Try a more specific name.")
    _CACHE[key] = point
    return point
