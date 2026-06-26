"""
On-demand points-of-interest from OpenStreetMap, for trip destinations we have no
synced catalogue for.

The trip planner scores pre-synced ``Place`` rows. For a city nobody has seeded
(say, Ratlam) that list is empty, so the itinerary used to fall back to generic
filler ("guided local walk", "Dinner at Local dining"). This module pulls *real*
cafés, restaurants and sights live from OSM (via Overpass) for any coordinate, so
the itinerary can name actual venues instead.

Same contract as hubs.py: async, in-process cache keyed on rounded coordinates,
and graceful degradation — any failure returns empty lists and the planner simply
keeps whatever it already had. Nothing here is fabricated: every venue is a real
OSM feature with a name; the only inference is mapping OSM ``cuisine`` tags onto
our diet tags, and only when the tag explicitly says so.
"""

import logging
from typing import Optional

logger = logging.getLogger("tripsova.live_places")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
_USER_AGENT = "Tripsova/1.0 (trip planner; contact: support@tripsova.app)"

# Search radius around the city centre (metres) and a cap on returned features.
_RADIUS_M = 6000
_LIMIT = 80

# (round(lat,2), round(lng,2)) -> {"sights": [...], "food": [...]}
_CACHE: dict[tuple, dict] = {}


async def _overpass(query: str) -> list[dict]:
    import httpx

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                OVERPASS_URL, data={"data": query}, headers={"User-Agent": _USER_AGENT}
            )
        if resp.status_code >= 400:
            logger.warning("Overpass HTTP %s (live places)", resp.status_code)
            return []
        return resp.json().get("elements", [])
    except Exception:
        logger.exception("Overpass query failed (live places)")
        return []


def _coords(el: dict) -> Optional[tuple[float, float]]:
    if el.get("lat") is not None and el.get("lon") is not None:
        return el["lat"], el["lon"]
    center = el.get("center")
    if center:
        return center["lat"], center["lon"]
    return None


def _address(tags: dict) -> Optional[str]:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:suburb") or tags.get("addr:neighbourhood"),
        tags.get("addr:city"),
    ]
    line = ", ".join(p for p in parts if p)
    return line or None


def _diet_tags(cuisine: Optional[str]) -> list[str]:
    """Infer diet tags from an OSM cuisine tag — only when it explicitly says so."""
    if not cuisine:
        return []
    c = cuisine.lower()
    tags = []
    if "vegan" in c:
        tags.append("vegan")
    if "vegetarian" in c:
        tags.append("veg")
    return tags


def _sight_type(tags: dict) -> str:
    """Map OSM tourism/historic tags onto our place-type vocabulary."""
    if tags.get("tourism") == "viewpoint":
        return "VIEWPOINT"
    return "TOURIST_SPOT"


async def fetch_live_pois(lat: float, lng: float) -> dict:
    """Real cafés, restaurants and sights near a point, from OpenStreetMap.

    Returns ``{"sights": [...], "food": [...]}`` (possibly empty). Cached per area.
    """
    ckey = (round(lat, 2), round(lng, 2))
    if ckey in _CACHE:
        return _CACHE[ckey]

    r = _RADIUS_M
    sight_kinds = "attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"
    query = (
        "[out:json][timeout:25];("
        f'node["amenity"="cafe"]["name"](around:{r},{lat},{lng});'
        f'node["amenity"="restaurant"]["name"](around:{r},{lat},{lng});'
        f'node["tourism"~"{sight_kinds}"]["name"](around:{r},{lat},{lng});'
        f'way["tourism"~"{sight_kinds}"]["name"](around:{r},{lat},{lng});'
        f'node["historic"]["name"](around:{r},{lat},{lng});'
        f'way["historic"]["name"](around:{r},{lat},{lng});'
        f");out center {_LIMIT};"
    )
    elements = await _overpass(query)

    sights: list[dict] = []
    food: list[dict] = []
    seen_names: set[str] = set()

    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name:en") or tags.get("name")
        coords = _coords(el)
        if not name or coords is None:
            continue
        dedupe_key = name.strip().lower()
        if dedupe_key in seen_names:
            continue
        seen_names.add(dedupe_key)

        osm_id = f"osm:{el.get('type', 'node')}:{el.get('id')}"
        base = {
            "id": osm_id,
            "name": name,
            "latitude": coords[0],
            "longitude": coords[1],
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "address": _address(tags),
        }

        amenity = tags.get("amenity")
        if amenity in ("cafe", "restaurant"):
            cuisine = tags.get("cuisine")
            food.append({
                **base,
                "type": "CAFE" if amenity == "cafe" else "RESTAURANT",
                "cuisine": cuisine,
                "diet_tags": _diet_tags(cuisine),
            })
        else:
            sights.append({**base, "type": _sight_type(tags)})

    result = {"sights": sights, "food": food}
    _CACHE[ckey] = result
    return result
