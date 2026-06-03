import httpx
from typing import Optional

from app.shared.utils import utcnow


class OSMProvider:
    BASE_URL = "https://nominatim.openstreetmap.org"
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    USER_AGENT = "Tripova/1.0"

    async def search_places(
        self,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        params = {
            "q": query,
            "format": "json",
            "limit": 20,
            "addressdetails": 1,
            "extratags": 1,
        }
        if lat is not None and lng is not None:
            params["lat"] = lat
            params["lon"] = lng

        headers = {"User-Agent": self.USER_AGENT}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/search",
                params=params,
                headers=headers,
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data:
            results.append({
                "source_id": str(item.get("osm_id")),
                "source": "openstreetmap",
                "name": item.get("display_name", ""),
                "short_name": item.get("name", ""),
                "lat": float(item["lat"]) if item.get("lat") else None,
                "lng": float(item["lon"]) if item.get("lon") else None,
                "type": item.get("type"),
                "category": item.get("category"),
                "address": item.get("address", {}),
                "extratags": item.get("extratags", {}),
                "importance": item.get("importance"),
            })
        return results

    async def get_place_details(self, osm_id: str) -> dict:
        params = {
            "osm_ids": f"R{osm_id}" if osm_id.startswith("R") else f"N{osm_id}" if osm_id.startswith("N") else f"W{osm_id}",
            "format": "json",
            "addressdetails": 1,
            "extratags": 1,
        }
        headers = {"User-Agent": self.USER_AGENT}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/lookup",
                params=params,
                headers=headers,
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()

        if not data:
            return {}

        item = data[0]
        return {
            "source_id": str(item.get("osm_id")),
            "source": "openstreetmap",
            "name": item.get("display_name", ""),
            "short_name": item.get("name", ""),
            "lat": float(item["lat"]) if item.get("lat") else None,
            "lng": float(item["lon"]) if item.get("lon") else None,
            "type": item.get("type"),
            "category": item.get("category"),
            "address": item.get("address", {}),
            "extratags": item.get("extratags", {}),
            "website": item.get("extratags", {}).get("website"),
            "phone": item.get("extratags", {}).get("phone"),
            "opening_hours": item.get("extratags", {}).get("opening_hours"),
            "image_url": item.get("extratags", {}).get("image"),
        }

    async def query_overpass(self, query: str) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.OVERPASS_URL,
                data={"data": query},
                headers={"User-Agent": self.USER_AGENT},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("elements", [])


osm_provider = OSMProvider()
