"""Tests for GET /api/trips/geocode — the endpoint that lets the manual route
planner accept any typed city (resolved via DB → OpenStreetMap) instead of being
limited to a hardcoded dropdown. Geocoding itself is mocked so tests never touch
the network.
"""

import pytest
from httpx import AsyncClient

from app.modules.trips import routes as trips_routes
from app.modules.trips.geocode import GeocodeError


class TestGeocodeEndpoint:
    @pytest.mark.asyncio
    async def test_resolves_a_typed_city_to_coordinates(self, client: AsyncClient, user_headers: dict, monkeypatch):
        async def _fake(db, name):
            return {"name": "Ratlam", "latitude": 23.3315, "longitude": 75.0367, "source": "nominatim"}

        monkeypatch.setattr(trips_routes, "geocode_city", _fake)

        resp = await client.get("/api/trips/geocode", params={"q": "ratlam"}, headers=user_headers)
        assert resp.status_code == 200
        # response_model=RoutePoint trims provenance to exactly the planner's needs.
        assert resp.json() == {"name": "Ratlam", "latitude": 23.3315, "longitude": 75.0367}

    @pytest.mark.asyncio
    async def test_unknown_place_returns_404(self, client: AsyncClient, user_headers: dict, monkeypatch):
        async def _fake(db, name):
            raise GeocodeError(f"Could not locate '{name}'.")

        monkeypatch.setattr(trips_routes, "geocode_city", _fake)

        resp = await client.get("/api/trips/geocode", params={"q": "atlantis"}, headers=user_headers)
        assert resp.status_code == 404
        assert "Could not locate" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_requires_authentication(self, client: AsyncClient):
        resp = await client.get("/api/trips/geocode", params={"q": "ratlam"})
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_blank_query_is_rejected(self, client: AsyncClient, user_headers: dict):
        resp = await client.get("/api/trips/geocode", params={"q": ""}, headers=user_headers)
        assert resp.status_code == 422  # min_length=1 validation
