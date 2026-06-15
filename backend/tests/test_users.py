import pytest
from httpx import AsyncClient


class TestUsersProfile:
    @pytest.mark.asyncio
    async def test_update_me_persists_editable_profile_fields(self, client: AsyncClient, user_headers: dict):
        response = await client.put(
            "/api/users/me",
            headers=user_headers,
            json={
                "name": "Edited Traveller",
                "phone": "+919876543210",
                "diet_preference": {"jain": True, "pure_veg": True},
                "travel_style": {"interests": ["Nature", "Culture"]},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Edited Traveller"
        assert data["phone"] == "+919876543210"
        assert data["diet_preference"] == {"jain": True, "pure_veg": True}
        assert data["travel_style"] == {"interests": ["Nature", "Culture"]}

    @pytest.mark.asyncio
    async def test_update_me_without_token_returns_401(self, client: AsyncClient):
        response = await client.put("/api/users/me", json={"name": "No Token"})

        assert response.status_code == 401
