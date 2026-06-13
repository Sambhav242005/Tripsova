from httpx import AsyncClient


async def _register(client: AsyncClient, email: str) -> dict:
    response = await client.post(
        "/api/auth/register",
        json={"name": "Refresh Tester", "email": email, "password": "password123"},
    )
    assert response.status_code == 201
    return response.json()


class TestTokenIssue:
    async def test_register_returns_refresh_token(self, client: AsyncClient):
        body = await _register(client, "refresh-register@example.com")
        assert body["access_token"]
        assert body["refresh_token"]

    async def test_login_returns_refresh_token(self, client: AsyncClient):
        await _register(client, "refresh-login@example.com")
        response = await client.post(
            "/api/auth/login",
            json={"email": "refresh-login@example.com", "password": "password123"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["access_token"]
        assert body["refresh_token"]


class TestRefreshRotation:
    async def test_refresh_issues_new_token_pair(self, client: AsyncClient):
        body = await _register(client, "refresh-rotate@example.com")
        response = await client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
        assert response.status_code == 200
        rotated = response.json()
        assert rotated["access_token"]
        assert rotated["refresh_token"]
        assert rotated["refresh_token"] != body["refresh_token"]

    async def test_new_access_token_is_usable(self, client: AsyncClient):
        body = await _register(client, "refresh-usable@example.com")
        response = await client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
        access_token = response.json()["access_token"]
        me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "refresh-usable@example.com"

    async def test_reused_refresh_token_is_rejected(self, client: AsyncClient):
        body = await _register(client, "refresh-reuse@example.com")
        first = await client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
        assert first.status_code == 200
        second = await client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
        assert second.status_code == 401

    async def test_garbage_refresh_token_is_rejected(self, client: AsyncClient):
        response = await client.post("/api/auth/refresh", json={"refresh_token": "not-a-real-token"})
        assert response.status_code == 401


class TestLogout:
    async def test_logout_revokes_refresh_token(self, client: AsyncClient):
        body = await _register(client, "refresh-logout@example.com")
        response = await client.post("/api/auth/logout", json={"refresh_token": body["refresh_token"]})
        assert response.status_code == 204
        after = await client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
        assert after.status_code == 401

    async def test_logout_with_unknown_token_is_rejected(self, client: AsyncClient):
        response = await client.post("/api/auth/logout", json={"refresh_token": "unknown-token"})
        assert response.status_code == 401
