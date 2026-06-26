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
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
_USER_AGENT = "Tripsova/1.0 (trip planner; contact: support@tripsova.app)"

# name(lower) -> {name, latitude, longitude, source}
_CACHE: dict[str, dict] = {}
# "lat,lng" (rounded) -> human address string (OSM-derived) or None
_REVERSE_CACHE: dict[str, Optional[str]] = {}


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


# OSM "place" types that denote a populated settlement centre (a node we want to
# land *inside*), in rough order of how well they match "the city the user typed".
# A district/state boundary's centroid can sit tens of km from the actual town
# (e.g. "Ratlam" → the district centroid ~25 km NW of Ratlam city), which then
# makes every "near here" lookup — food, fuel, sights — miss the real place.
_PLACE_RANK = {"city": 0, "town": 1, "municipality": 2, "village": 3, "suburb": 4}


async def _from_nominatim(name: str) -> Optional[dict]:
    import httpx

    # Pull a handful of candidates (not just the top one) so we can prefer the
    # populated-place node over an administrative boundary that happens to outrank it.
    params = {"q": name, "format": "json", "limit": 5, "countrycodes": "in", "addressdetails": 1}
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

    # Prefer a settlement centre (class=place, type=city/town/village) over a
    # boundary/administrative result. Among settlements, the higher-ranked type
    # wins; otherwise fall back to Nominatim's own top hit.
    def _rank(h: dict) -> tuple[int, int]:
        is_place = h.get("class") == "place"
        type_rank = _PLACE_RANK.get(h.get("type", ""), 99)
        return (0 if is_place and type_rank < 99 else 1, type_rank)

    hit = min(hits, key=_rank)
    return {
        "name": hit.get("display_name", name).split(",")[0].strip() or name,
        "latitude": float(hit["lat"]),
        "longitude": float(hit["lon"]),
        "source": "nominatim",
    }


# Most-specific → least-specific OSM address fields we stitch into a short, readable
# line. Nominatim returns these under "address"; we never invent any of them.
_REVERSE_ADDR_FIELDS = (
    "road",
    "neighbourhood",
    "suburb",
    "quarter",
    "city_district",
    "village",
    "town",
    "city",
)


async def reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """Resolve a coordinate to a short human address using OpenStreetMap's Nominatim
    reverse endpoint. Returns None (never a fabricated string) when nothing is found.

    Cached per (rounded) coordinate so repeat lookups don't re-hit the network. Callers
    that loop over many points must throttle themselves to ~1 req/sec per Nominatim's
    usage policy — this helper does not sleep.
    """
    if lat is None or lng is None:
        return None
    key = f"{round(lat, 5)},{round(lng, 5)}"
    if key in _REVERSE_CACHE:
        return _REVERSE_CACHE[key]

    import httpx

    params = {"lat": lat, "lon": lng, "format": "json", "zoom": 18, "addressdetails": 1}
    headers = {"User-Agent": _USER_AGENT}
    address: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(NOMINATIM_REVERSE_URL, params=params, headers=headers)
        if resp.status_code >= 400:
            logger.warning("Nominatim reverse HTTP %s for %s", resp.status_code, key)
            _REVERSE_CACHE[key] = None
            return None
        data = resp.json()
    except Exception:
        logger.exception("Nominatim reverse lookup failed for %s", key)
        return None  # transient — don't cache, allow a later retry

    addr = (data or {}).get("address") or {}
    parts: list[str] = []
    for field in _REVERSE_ADDR_FIELDS:
        val = addr.get(field)
        if val and val not in parts:
            parts.append(val)
    # Keep it to the two most-specific components ("Road, Suburb") so cards stay tidy.
    if parts:
        address = ", ".join(parts[:2])
    elif data.get("display_name"):
        # Fall back to the first couple of the full display name segments.
        segs = [s.strip() for s in str(data["display_name"]).split(",") if s.strip()]
        address = ", ".join(segs[:2]) or None

    _REVERSE_CACHE[key] = address
    return address


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
