import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.modules.transit.bmtc_provider import BMTCApiError


@pytest.fixture
def mock_provider():
    provider = AsyncMock()
    provider.search_routes = AsyncMock(return_value=[
        {"routeparentid": 100, "routeno": "500", "routename": "KBS Market to Majestic"},
    ])
    provider.search_stops = AsyncMock(return_value=[
        {"routeid": 1, "routename": "Majestic", "center_lat": 12.976, "center_lon": 77.571},
    ])
    provider.get_route_details = AsyncMock(return_value={
        "Issuccess": True,
        "up": {
            "data": [
                {
                    "stationid": 1, "stationname": "Start", "centerlat": 12.97, "centerlong": 77.57,
                    "vehicleDetails": [
                        {"vehicleid": 10, "vehiclenumber": "KA-01-1234", "centerlat": 12.97, "centerlong": 77.57, "heading": 90}
                    ]
                }
            ]
        },
        "down": {"data": []},
    })
    provider.get_vehicle_trip = AsyncMock(return_value={
        "RouteDetails": [{"routeno": "500", "busno": "KA-01-1234"}],
        "LiveLocation": [{"vehicleid": 10, "vehiclenumber": "KA-01-1234", "routeno": "500", "latitude": 12.97, "longitude": 77.57, "previousstop": "Mall", "nextstop": "Market", "heading": 90}],
    })
    provider.get_all_routes = AsyncMock(return_value=[
        {"routeid": 1, "routeno": "500", "routename": "KBS-Majestic", "fromstation": "KBS", "tostation": "Majestic"},
    ])
    provider.close = AsyncMock()
    return provider


@pytest.fixture
async def transit_client(mock_provider):
    from app.modules.transit.routes import get_provider

    async def override_get_provider():
        return mock_provider

    app.dependency_overrides[get_provider] = override_get_provider
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_search_routes_and_stops(transit_client):
    resp = await transit_client.get("/api/transit/search?q=majestic")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["routes"]) > 0
    assert data["routes"][0]["route_no"] == "500"
    assert len(data["stops"]) > 0


@pytest.mark.asyncio
async def test_search_no_results(transit_client, mock_provider):
    mock_provider.search_routes = AsyncMock(return_value=[])
    mock_provider.search_stops = AsyncMock(return_value=[])
    resp = await transit_client.get("/api/transit/search?q=zzzzz")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_route_live(transit_client):
    resp = await transit_client.get("/api/transit/routes/100")
    assert resp.status_code == 200
    data = resp.json()
    assert data["route_id"] == 100
    assert len(data["up"]["stations"]) > 0
    assert len(data["up"]["live_buses"]) > 0


@pytest.mark.asyncio
async def test_route_live_failure(transit_client, mock_provider):
    mock_provider.get_route_details = AsyncMock(side_effect=BMTCApiError("BMTC down"))
    resp = await transit_client.get("/api/transit/routes/999")
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_vehicle_track(transit_client):
    resp = await transit_client.get("/api/transit/vehicle/10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["vehicle_number"] == "KA-01-1234"
    assert data["live_location"] is not None
    assert data["live_location"]["current_stop"] == "Mall"


@pytest.mark.asyncio
async def test_vehicle_track_failure(transit_client, mock_provider):
    mock_provider.get_vehicle_trip = AsyncMock(side_effect=BMTCApiError("BMTC down"))
    resp = await transit_client.get("/api/transit/vehicle/999")
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_all_routes(transit_client):
    resp = await transit_client.get("/api/transit/all-routes")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert len(data["routes"]) >= 1


@pytest.mark.asyncio
async def test_all_routes_failure(transit_client, mock_provider):
    mock_provider.get_all_routes = AsyncMock(side_effect=BMTCApiError("BMTC down"))
    resp = await transit_client.get("/api/transit/all-routes")
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_transit_cache_hit(mock_provider):
    from app.modules.transit.service import _cache_get, _cache_set
    _cache_set("routes:test", [{"test": True}])
    cached = _cache_get("routes:test")
    assert cached is not None
    assert cached[0]["test"] is True
