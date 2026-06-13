import uuid

from httpx import AsyncClient

UNKNOWN_ID = str(uuid.uuid4())


class TestDashboard:
    async def test_admin_gets_dashboard_stats(self, client: AsyncClient, admin_headers, test_user):
        response = await client.get("/api/admin/dashboard", headers=admin_headers)
        assert response.status_code == 200
        body = response.json()
        assert set(body) == {"users", "destinations", "places", "bookings", "feed_posts"}
        assert all(isinstance(v, int) for v in body.values())
        assert body["users"] >= 1

    async def test_non_admin_is_forbidden(self, client: AsyncClient, user_headers):
        response = await client.get("/api/admin/dashboard", headers=user_headers)
        assert response.status_code == 403

    async def test_unauthenticated_is_rejected(self, client: AsyncClient):
        response = await client.get("/api/admin/dashboard")
        assert response.status_code == 401


class TestSyncDestination:
    async def test_unknown_destination_returns_404_for_admin(self, client: AsyncClient, admin_headers):
        response = await client.post(f"/api/admin/sync/destination/{UNKNOWN_ID}", headers=admin_headers)
        assert response.status_code == 404

    async def test_non_admin_is_forbidden(self, client: AsyncClient, user_headers):
        response = await client.post(f"/api/admin/sync/destination/{UNKNOWN_ID}", headers=user_headers)
        assert response.status_code == 403


class TestSyncPlaces:
    async def test_unknown_destination_returns_404_for_admin(self, client: AsyncClient, admin_headers):
        response = await client.post(f"/api/admin/sync/places/{UNKNOWN_ID}", headers=admin_headers)
        assert response.status_code == 404

    async def test_non_admin_is_forbidden(self, client: AsyncClient, user_headers):
        response = await client.post(f"/api/admin/sync/places/{UNKNOWN_ID}", headers=user_headers)
        assert response.status_code == 403


class TestEnrichPlace:
    async def test_unknown_place_returns_404_for_admin(self, client: AsyncClient, admin_headers):
        response = await client.post(f"/api/admin/sync/place/{UNKNOWN_ID}/enrich", headers=admin_headers)
        assert response.status_code == 404

    async def test_non_admin_is_forbidden(self, client: AsyncClient, user_headers):
        response = await client.post(f"/api/admin/sync/place/{UNKNOWN_ID}/enrich", headers=user_headers)
        assert response.status_code == 403
