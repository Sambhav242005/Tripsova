import pytest
from httpx import AsyncClient


class TestTripPods:
    @pytest.mark.asyncio
    async def test_create_trip_pod_with_unknown_destination_title(self, client: AsyncClient, user_headers: dict):
        payload = {
            "title": "Ratlam",
            "start_date": "2026-07-18T00:00:00",
            "end_date": "2026-07-20T00:00:00",
            "max_members": 4,
            "travel_style": {
                "origin": "Indore",
                "destination": "Ratlam",
                "style": "Food",
                "note": "Prefer local food and safe transit.",
            },
        }

        response = await client.post("/api/trippods", json=payload, headers=user_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Ratlam"
        assert data["destination_id"] is None
        assert data["start_date"].startswith("2026-07-18")
        assert data["end_date"].startswith("2026-07-20")
        assert data["travel_style"]["origin"] == "Indore"
        assert data["member_count"] == 1

        list_response = await client.get("/api/trippods?page=1&per_page=100", headers=user_headers)
        assert list_response.status_code == 200
        listed = next(item for item in list_response.json()["items"] if item["id"] == data["id"])
        assert listed["member_count"] == 1
