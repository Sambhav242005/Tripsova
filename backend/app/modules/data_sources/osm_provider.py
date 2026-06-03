from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data_sources.base import DataProvider
from app.modules.maps.osm import OSMProvider


class OpenStreetMapProvider(DataProvider):
    def __init__(self):
        self._osm = OSMProvider()

    @property
    def name(self) -> str:
        return "openstreetmap"

    async def search_places(
        self,
        db: AsyncSession,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        results = await self._osm.search_places(query, lat, lng, radius)
        normalized = []
        for r in results:
            normalized.append(self._normalize(r))
        return normalized

    async def get_place_details(
        self,
        db: AsyncSession,
        source_id: str,
    ) -> dict:
        details = await self._osm.get_place_details(source_id)
        return self._normalize(details)

    async def get_destination_info(
        self,
        db: AsyncSession,
        destination_name: str,
    ) -> dict:
        results = await self._osm.search_places(destination_name)
        if results:
            return self._normalize(results[0])
        return {}

    def _normalize(self, data: dict) -> dict:
        return {
            "source_id": data.get("source_id"),
            "source": self.name,
            "name": data.get("short_name") or data.get("name", ""),
            "full_name": data.get("name", ""),
            "lat": data.get("lat"),
            "lng": data.get("lng"),
            "type": data.get("type"),
            "category": data.get("category"),
            "address": data.get("address"),
            "contact_info": {
                "phone": data.get("phone") or data.get("extratags", {}).get("phone"),
                "website": data.get("website") or data.get("extratags", {}).get("website"),
                "opening_hours": data.get("opening_hours") or data.get("extratags", {}).get("opening_hours"),
            },
            "image_url": data.get("image_url"),
            "rating": None,
            "review_count": None,
        }
