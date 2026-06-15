import pytest
from httpx import AsyncClient


class TestFeedPosts:
    @pytest.mark.asyncio
    async def test_create_feed_post_and_list_it(self, client: AsyncClient, user_headers: dict):
        payload = {"content": "Live traveller update from the mobile QA flow."}

        create_response = await client.post("/api/feed", json=payload, headers=user_headers)

        assert create_response.status_code == 201
        created = create_response.json()
        assert created["content"] == payload["content"]
        assert created["helpful_count"] == 0
        assert created["user_id"]

        list_response = await client.get("/api/feed")
        assert list_response.status_code == 200
        data = list_response.json()
        assert data["total"] >= 1
        assert any(item["id"] == created["id"] for item in data["items"])

    @pytest.mark.asyncio
    async def test_mark_feed_post_helpful(self, client: AsyncClient, user_headers: dict):
        create_response = await client.post(
            "/api/feed",
            json={"content": "Helpful count regression check."},
            headers=user_headers,
        )
        post_id = create_response.json()["id"]

        helpful_response = await client.post(f"/api/feed/{post_id}/helpful")

        assert helpful_response.status_code == 200
        list_response = await client.get("/api/feed")
        item = next(item for item in list_response.json()["items"] if item["id"] == post_id)
        assert item["helpful_count"] == 1
