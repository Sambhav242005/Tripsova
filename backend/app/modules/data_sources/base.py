from abc import ABC, abstractmethod
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession


class DataProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    async def search_places(
        self,
        db: AsyncSession,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        ...

    @abstractmethod
    async def get_place_details(
        self,
        db: AsyncSession,
        source_id: str,
    ) -> dict:
        ...

    @abstractmethod
    async def get_destination_info(
        self,
        db: AsyncSession,
        destination_name: str,
    ) -> dict:
        ...


class DataIngestionService:
    def __init__(self, providers: list[DataProvider]):
        self.providers = providers

    async def search_all(
        self,
        db: AsyncSession,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        all_results = []
        for provider in self.providers:
            try:
                results = await provider.search_places(db, query, lat, lng, radius)
                for r in results:
                    r["_provider"] = provider.name
                all_results.extend(results)
            except Exception:
                continue
        return self._deduplicate(all_results)

    def _deduplicate(self, results: list[dict]) -> list[dict]:
        seen = set()
        deduped = []
        for r in results:
            key = (r.get("name", "").lower(), r.get("lat"), r.get("lng"))
            if key not in seen:
                seen.add(key)
                deduped.append(r)
        return deduped
