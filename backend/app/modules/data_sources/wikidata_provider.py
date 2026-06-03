import httpx
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data_sources.base import DataProvider


class WikidataProvider(DataProvider):
    """
    Queries the Wikidata SPARQL endpoint for structured place and destination data.
    Returns canonical names, coordinates, Wikipedia links, and property values.
    """

    SPARQL_URL = "https://query.wikidata.org/sparql"

    @property
    def name(self) -> str:
        return "wikidata"

    async def search_places(
        self,
        db: AsyncSession,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
    ) -> list[dict]:
        sparql = f"""
        SELECT ?item ?itemLabel ?lat ?lng ?description WHERE {{
          ?item wdt:P31/wdt:P279* wd:Q839954 .
          ?item rdfs:label ?itemLabel .
          FILTER(CONTAINS(LCASE(?itemLabel), LCASE("{query}")))
          OPTIONAL {{ ?item wdt:P625 ?coords . }}
          OPTIONAL {{ ?item schema:description ?description . FILTER(LANG(?description) = "en") }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 20
        """
        return await self._query_sparql(sparql)

    async def get_place_details(
        self,
        db: AsyncSession,
        source_id: str,
    ) -> dict:
        sparql = f"""
        SELECT ?item ?itemLabel ?lat ?lng ?description ?image ?website ?phone WHERE {{
          BIND(wd:{source_id} AS ?item)
          ?item wdt:P31/wdt:P279* wd:Q839954 .
          ?item rdfs:label ?itemLabel .
          OPTIONAL {{ ?item wdt:P625 ?coords . }}
          OPTIONAL {{ ?item schema:description ?description . FILTER(LANG(?description) = "en") }}
          OPTIONAL {{ ?item wdt:P18 ?image . }}
          OPTIONAL {{ ?item wdt:P856 ?website . }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 1
        """
        results = await self._query_sparql(sparql)
        return results[0] if results else {}

    async def get_destination_info(
        self,
        db: AsyncSession,
        destination_name: str,
    ) -> dict:
        sparql = f"""
        SELECT ?item ?itemLabel ?lat ?lng ?description ?image WHERE {{
          ?item wdt:P31 wd:Q5107 .
          ?item rdfs:label ?itemLabel .
          FILTER(CONTAINS(LCASE(?itemLabel), LCASE("{destination_name}")))
          OPTIONAL {{ ?item wdt:P625 ?coords . }}
          OPTIONAL {{ ?item schema:description ?description . FILTER(LANG(?description) = "en") }}
          OPTIONAL {{ ?item wdt:P18 ?image . }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 1
        """
        results = await self._query_sparql(sparql)
        return results[0] if results else {}

    async def _query_sparql(self, query: str) -> list[dict]:
        headers = {
            "User-Agent": "Tripova/1.0",
            "Accept": "application/json",
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.SPARQL_URL,
                    params={"query": query, "format": "json"},
                    headers=headers,
                    timeout=30,
                )
                response.raise_for_status()
                data = response.json()
            except Exception:
                return []

        results = []
        for binding in data.get("results", {}).get("bindings", []):
            item = binding.get("item", {}).get("value", "")
            lat = None
            lng = None
            coord = binding.get("coords", {}).get("value")
            if coord:
                parts = coord.lstrip("Point(").rstrip(")").split()
                if len(parts) == 2:
                    lng, lat = float(parts[0]), float(parts[1])
            results.append({
                "source_id": item.split("/")[-1] if item else None,
                "source": self.name,
                "name": binding.get("itemLabel", {}).get("value", ""),
                "description": binding.get("description", {}).get("value"),
                "lat": lat,
                "lng": lng,
                "image_url": binding.get("image", {}).get("value"),
                "website": binding.get("website", {}).get("value"),
            })
        return results
