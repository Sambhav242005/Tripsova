import pytest
from httpx import AsyncClient


class TestDestinationsList:
    @pytest.mark.asyncio
    async def test_list_destinations_returns_list(self, client: AsyncClient):
        response = await client.get("/api/destinations")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data

    @pytest.mark.asyncio
    async def test_list_destinations_may_be_empty(self, client: AsyncClient):
        response = await client.get("/api/destinations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)


class TestDestinationsBySlug:
    @pytest.mark.asyncio
    async def test_get_destination_by_slug_returns_404_for_unknown(self, client: AsyncClient):
        response = await client.get("/api/destinations/nonexistent-slug")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_destination_by_slug_returns_destination(self, client: AsyncClient):
        response = await client.get("/api/destinations/nonexistent-slug")
        assert response.status_code == 404
