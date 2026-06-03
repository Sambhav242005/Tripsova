import httpx
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.data_sources.base import DataProvider


class GooglePlacesProvider(DataProvider):
    """
    Uses the Google Places API to search for places and get details.
    Requires GOOGLE_PLACES_API_KEY in environment variables.
    Falls back gracefully if no key is configured.
    """

    SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
    NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    @property
    def name(self) -> str:
        return "google_places"

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

        params = {
            "query": query,
            "key": settings.GOOGLE_PLACES_API_KEY,
        }
        if lat is not None and lng is not None:
            params["location"] = f"{lat},{lng}"
            params["radius"] = (radius or 5) * 1000

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.SEARCH_URL,
                    params=params,
                    timeout=15,
                )
                response.raise_for_status()
                data = response.json()
            except Exception:
                return []

        if data.get("status") != "OK":
            return []

        results = []
        for item in data.get("results", []):
            geometry = item.get("geometry", {}).get("location", {})
            results.append({
                "source_id": item.get("place_id"),
                "source": self.name,
                "name": item.get("name", ""),
                "full_address": item.get("formatted_address", ""),
                "lat": geometry.get("lat"),
                "lng": geometry.get("lng"),
                "rating": item.get("rating"),
                "review_count": item.get("user_ratings_total"),
                "types": item.get("types", []),
                "icon": item.get("icon"),
                "photos": item.get("photos", []),
            })
        return results

    async def get_place_details(
        self,
        db: AsyncSession,
        source_id: str,
    ) -> dict:
        if not settings.GOOGLE_PLACES_API_KEY:
            return {}

        params = {
            "place_id": source_id,
            "key": settings.GOOGLE_PLACES_API_KEY,
            "fields": "name,rating,formatted_address,geometry,types,url,website,formatted_phone_number,opening_hours,user_ratings_total,photos,price_level",
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.DETAILS_URL,
                    params=params,
                    timeout=15,
                )
                response.raise_for_status()
                data = response.json()
            except Exception:
                return {}

        result = data.get("result", {})
        geometry = result.get("geometry", {}).get("location", {})
        return {
            "source_id": result.get("place_id"),
            "source": self.name,
            "name": result.get("name", ""),
            "full_address": result.get("formatted_address", ""),
            "lat": geometry.get("lat"),
            "lng": geometry.get("lng"),
            "rating": result.get("rating"),
            "review_count": result.get("user_ratings_total"),
            "types": result.get("types", []),
            "contact_info": {
                "phone": result.get("formatted_phone_number"),
                "website": result.get("website"),
                "url": result.get("url"),
                "opening_hours": result.get("opening_hours", {}).get("weekday_text"),
            },
            "price_level": result.get("price_level"),
            "photos": result.get("photos", []),
        }

    async def get_destination_info(
        self,
        db: AsyncSession,
        destination_name: str,
    ) -> dict:
        return {}
