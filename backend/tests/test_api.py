import pytest
from httpx import AsyncClient


class TestRoot:
    @pytest.mark.asyncio
    async def test_root_endpoint(self, client: AsyncClient):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"


class TestHealth:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestIntegration:
    @pytest.mark.asyncio
    async def test_full_auth_flow(self, client: AsyncClient):
        register_payload = {
            "name": "Integration User",
            "email": "integration@example.com",
            "password": "strongpass123",
        }
        register_response = await client.post("/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        register_data = register_response.json()
        assert "access_token" in register_data
        token = register_data["access_token"]

        login_payload = {"email": "integration@example.com", "password": "strongpass123"}
        login_response = await client.post("/api/auth/login", json=login_payload)
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "access_token" in login_data

        headers = {"Authorization": f"Bearer {token}"}
        me_response = await client.get("/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["email"] == "integration@example.com"

    @pytest.mark.asyncio
    async def test_create_destination_fails_without_admin(self, client: AsyncClient, user_headers: dict):
        payload = {
            "name": "Unauthorized Destination",
            "city": "TestCity",
            "state": "TestState",
            "country": "Testland",
            "description": "Should fail",
            "best_time_to_visit": "Year round",
            "average_budget_min": 100,
            "average_budget_max": 500,
            "safety_summary": "Safe",
            "weather_summary": "Nice",
            "crowd_level": "Low",
            "internet_quality": "Good",
            "latitude": 12.34,
            "longitude": 56.78,
        }
        response = await client.post("/api/destinations", json=payload, headers=user_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_explore_endpoints_return_ok(self, client: AsyncClient):
        response = await client.get("/api/places")
        assert response.status_code in (200, 404)

        response = await client.get("/api/destinations")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_public_endpoints_no_auth_required(self, client: AsyncClient):
        root_response = await client.get("/")
        assert root_response.status_code == 200

        health_response = await client.get("/health")
        assert health_response.status_code == 200

        places_response = await client.get("/api/places")
        assert places_response.status_code == 200

        dests_response = await client.get("/api/destinations")
        assert dests_response.status_code == 200
