import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.modules.maps.osm import osm_provider
from app.modules.places.models import Place

FAKE_OVERPASS_ELEMENTS = [
    {
        "type": "node",
        "id": 111,
        "lat": 32.24,
        "lon": 77.18,
        "tags": {"amenity": "fuel", "name": "IOCL Manali", "phone": "+91-12345"},
    },
    {
        "type": "node",
        "id": 222,
        "lat": 32.25,
        "lon": 77.19,
        "tags": {"amenity": "fuel", "brand": "HPCL"},
    },
    {
        "type": "node",
        "id": 333,
        "tags": {"amenity": "fuel", "name": "No Coords Pump"},
    },
]


@pytest.fixture
async def destination(test_session):
    from app.modules.destinations.models import Destination

    dest = Destination(
        name="Fueltown",
        slug=f"fueltown-{uuid.uuid4().hex[:8]}",
        latitude=32.2396,
        longitude=77.1887,
    )
    test_session.add(dest)
    await test_session.flush()
    await test_session.refresh(dest)
    return dest


@pytest.fixture
def fake_overpass(monkeypatch):
    async def _fake_query(query: str):
        assert 'amenity"="fuel' in query
        return FAKE_OVERPASS_ELEMENTS

    monkeypatch.setattr(osm_provider, "query_overpass", _fake_query)


class TestFuelSync:
    async def test_admin_ingests_fuel_stations(
        self, client: AsyncClient, admin_headers, destination, test_session, fake_overpass
    ):
        response = await client.post(f"/api/admin/sync/fuel/{destination.id}", headers=admin_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["created"] == 2
        assert body["skipped"] == 1

        result = await test_session.execute(
            select(Place).where(Place.destination_id == destination.id, Place.type == "FUEL")
        )
        pumps = result.scalars().all()
        names = {p.name for p in pumps}
        assert names == {"IOCL Manali", "HPCL"}
        assert all(p.source == "openstreetmap" for p in pumps)

    async def test_unknown_destination_returns_404(self, client: AsyncClient, admin_headers, fake_overpass):
        response = await client.post(f"/api/admin/sync/fuel/{uuid.uuid4()}", headers=admin_headers)
        assert response.status_code == 404

    async def test_non_admin_is_forbidden(self, client: AsyncClient, user_headers, destination, fake_overpass):
        response = await client.post(f"/api/admin/sync/fuel/{destination.id}", headers=user_headers)
        assert response.status_code == 403
