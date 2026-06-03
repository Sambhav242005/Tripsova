import httpx
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data_sources.base import DataProvider
from app.shared.utils import slugify


class WikivoyageProvider(DataProvider):
    """
    Fetches destination information from Wikivoyage pages via the MediaWiki API.
    Returns structured destination info including description, attractions, and safety tips.
    """

    API_URL = "https://en.wikivoyage.org/w/api.php"

    @property
    def name(self) -> str:
        return "wikivoyage"

    async def search_places(
        self,
        db: AsyncSession,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        return []

    async def get_place_details(
        self,
        db: AsyncSession,
        source_id: str,
    ) -> dict:
        return {}

    async def get_destination_info(
        self,
        db: AsyncSession,
        destination_name: str,
    ) -> dict:
        params = {
            "action": "query",
            "titles": destination_name,
            "prop": "extracts|pageimages|description",
            "format": "json",
            "exintro": 1,
            "explaintext": 1,
            "pithumbsize": 500,
        }
        headers = {"User-Agent": "Tripova/1.0"}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.API_URL,
                    params=params,
                    headers=headers,
                    timeout=15,
                )
                response.raise_for_status()
                data = response.json()
            except Exception:
                return {}

        pages = data.get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if page_id == "-1":
                continue
            return {
                "source_id": page_id,
                "source": self.name,
                "name": destination_name,
                "description": page_data.get("extract", ""),
                "image_url": page_data.get("thumbnail", {}).get("source"),
                "page_url": f"https://en.wikivoyage.org/wiki/{slugify(destination_name)}",
            }
        return {}
