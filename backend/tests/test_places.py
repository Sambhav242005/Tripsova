import uuid
import pytest
from httpx import AsyncClient


class TestPlacesList:
    @pytest.mark.asyncio
    async def test_list_places_returns_list(self, client: AsyncClient):
        response = await client.get("/api/places")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data

    @pytest.mark.asyncio
    async def test_list_places_may_be_empty(self, client: AsyncClient):
        response = await client.get("/api/places")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)


class TestPlacesScore:
    @pytest.mark.asyncio
    async def test_get_place_score_returns_score_structure(self, client: AsyncClient):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/places/{fake_id}/score")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_score_response_has_all_components(self, client: AsyncClient):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/places/{fake_id}/score")
        assert response.status_code == 404
