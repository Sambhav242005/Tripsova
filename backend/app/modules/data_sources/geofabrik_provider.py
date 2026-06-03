from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data_sources.base import DataProvider


class GeofabrikProvider(DataProvider):
    """
    Bulk OSM data import provider using Geofabrik downloads.
    Geofabrik provides daily-updated OSM extracts per region/country.
    This provider is a placeholder for future bulk import workflows.

    Planned integration:
    - Download .osm.pbf files from https://download.geofabrik.de/
    - Parse with osmium/osmread into Place records
    - Scheduled nightly sync for known destinations
    - Delta updates using OSM replication diffs
    """

    @property
    def name(self) -> str:
        return "geofabrik"

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
        return {}
