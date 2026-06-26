import logging
import httpx
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.data_sources.base import DataProvider

logger = logging.getLogger("tripsova.google_places")

# Places API (New). The legacy maps.googleapis.com/maps/api/place/* endpoints are no
# longer enabled for new Google Cloud projects — they return HTTP 200 with
# status=REQUEST_DENIED and "You're calling a legacy API, which is not enabled for your
# project." The New API lives under places.googleapis.com/v1, authenticates with an
# X-Goog-Api-Key header, and *requires* an X-Goog-FieldMask on every request.
_SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText"
_DETAILS_URL = "https://places.googleapis.com/v1/places/{place_id}"

# Field masks are mandatory (an unmasked request is rejected) and also bound billing —
# keep them tight to the fields we actually map below.
_SEARCH_FIELD_MASK = ",".join(
    "places." + f
    for f in (
        "id", "displayName", "formattedAddress", "location",
        "rating", "userRatingCount", "types", "priceLevel",
    )
)
_DETAILS_FIELD_MASK = ",".join(
    (
        "id", "displayName", "formattedAddress", "location", "rating",
        "userRatingCount", "types", "priceLevel", "nationalPhoneNumber",
        "internationalPhoneNumber", "websiteUri", "googleMapsUri", "regularOpeningHours",
    )
)

# Places API (New) returns priceLevel as an enum; the rest of the app speaks the legacy
# 0-4 integer, so map it back.
_PRICE_LEVEL = {
    "PRICE_LEVEL_FREE": 0,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}


def _place_to_result(place: dict, source_name: str) -> dict:
    """Normalise one Places API (New) place object to our provider dict shape.

    Kept identical to the shape the rest of the ingestion pipeline already consumes
    (``full_address``, ``lat``/``lng``, ``review_count`` …) so nothing downstream
    changes — only the upstream API does.
    """
    loc = place.get("location") or {}
    return {
        "source_id": place.get("id"),
        "source": source_name,
        "name": (place.get("displayName") or {}).get("text", ""),
        "full_address": place.get("formattedAddress", ""),
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount"),
        "types": place.get("types", []),
        "icon": place.get("iconMaskBaseUri"),
        # New-API photos are resource names that need a *second*, key-bearing request to
        # resolve to an image URL. We don't expose the server key to the client, so we
        # skip them rather than persist unusable references.
        "photos": [],
    }


def parse_search_response(data: dict, source_name: str = "google_places") -> list[dict]:
    """Pure parser: Places API (New) :searchText payload -> list of provider dicts."""
    return [_place_to_result(p, source_name) for p in (data or {}).get("places", [])]


def parse_details_response(data: dict, source_name: str = "google_places") -> dict:
    """Pure parser: Places API (New) place-details payload -> a provider dict."""
    if not data or not data.get("id"):
        return {}
    result = _place_to_result(data, source_name)
    hours = (data.get("regularOpeningHours") or {}).get("weekdayDescriptions")
    result["contact_info"] = {
        "phone": data.get("nationalPhoneNumber") or data.get("internationalPhoneNumber"),
        "website": data.get("websiteUri"),
        "url": data.get("googleMapsUri"),
        "opening_hours": hours,
    }
    level = data.get("priceLevel")
    result["price_level"] = _PRICE_LEVEL.get(level) if isinstance(level, str) else level
    return result


class GooglePlacesProvider(DataProvider):
    """
    Uses the Google Places API (New) to search for places and get details.
    Requires GOOGLE_PLACES_API_KEY in environment variables.
    Falls back gracefully (returns []/{}) when no key is configured or the API errors.
    """

    @property
    def name(self) -> str:
        return "google_places"

    def _headers(self, field_mask: str) -> dict:
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": field_mask,
        }

    async def search_places(
        self,
        db: AsyncSession,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        if not settings.GOOGLE_PLACES_API_KEY:
            return []

        body: dict = {"textQuery": query}
        if lat is not None and lng is not None:
            # `radius` is in km here (caller passes radius_m / 1000); the New API circle
            # wants metres, bounded 0 < r <= 50000.
            radius_m = max(1.0, min((radius or 5) * 1000.0, 50000.0))
            body["locationBias"] = {
                "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": radius_m}
            }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    _SEARCH_TEXT_URL,
                    json=body,
                    headers=self._headers(_SEARCH_FIELD_MASK),
                    timeout=15,
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                # Surface what used to be swallowed: a silent [] here is exactly what
                # hid the legacy-API outage. Google puts error.status/message in the body.
                logger.warning(
                    "Google Places searchText failed (HTTP %s): %s",
                    exc.response.status_code, exc.response.text[:300],
                )
                return []
            except Exception:
                logger.warning("Google Places searchText request error", exc_info=True)
                return []

        return parse_search_response(data, self.name)

    async def get_place_details(
        self,
        db: AsyncSession,
        source_id: str,
    ) -> dict:
        if not settings.GOOGLE_PLACES_API_KEY or not source_id:
            return {}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    _DETAILS_URL.format(place_id=source_id),
                    headers=self._headers(_DETAILS_FIELD_MASK),
                    timeout=15,
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "Google Places details failed (HTTP %s): %s",
                    exc.response.status_code, exc.response.text[:300],
                )
                return {}
            except Exception:
                logger.warning("Google Places details request error", exc_info=True)
                return {}

        return parse_details_response(data, self.name)

    async def get_destination_info(
        self,
        db: AsyncSession,
        destination_name: str,
    ) -> dict:
        return {}
