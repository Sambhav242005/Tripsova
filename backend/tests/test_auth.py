import pytest
from httpx import AsyncClient


class TestAuthRegister:
    @pytest.mark.asyncio
    async def test_register_returns_token(self, client: AsyncClient):
        payload = {"name": "Test User", "email": "test@example.com", "password": "secret123"}
        response = await client.post("/api/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


class TestAuthLogin:
    @pytest.mark.asyncio
    async def test_login_with_valid_credentials(self, client: AsyncClient):
        register_payload = {"name": "Login User", "email": "login@example.com", "password": "password123"}
        await client.post("/api/auth/register", json=register_payload)

        login_payload = {"email": "login@example.com", "password": "password123"}
        response = await client.post("/api/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_with_invalid_credentials_returns_401(self, client: AsyncClient):
        login_payload = {"email": "nonexistent@example.com", "password": "wrongpassword"}
        response = await client.post("/api/auth/login", json=login_payload)
        assert response.status_code == 401


class TestAuthMe:
    @pytest.mark.asyncio
    async def test_get_me_with_valid_token(self, client: AsyncClient, user_token: str):
        headers = {"Authorization": f"Bearer {user_token}"}
        response = await client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data

    @pytest.mark.asyncio
    async def test_get_me_without_token_returns_401(self, client: AsyncClient):
        response = await client.get("/api/auth/me")
        assert response.status_code == 401
