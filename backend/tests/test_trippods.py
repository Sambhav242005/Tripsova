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
        # Host shown from the real creator (initials of "Fixture User" → "FU"), not
        # derived from the title (which would wrongly give "RA" from "Ratlam").
        assert data["creator_name"] == "Fixture User"
        assert data["creator_avatar"] == "FU"
        # The creator's custom intro round-trips so the card isn't stuck on a canned line.
        assert data["travel_style"]["note"] == "Prefer local food and safe transit."

        list_response = await client.get("/api/trippods?page=1&per_page=100", headers=user_headers)
        assert list_response.status_code == 200
        listed = next(item for item in list_response.json()["items"] if item["id"] == data["id"])
        assert listed["member_count"] == 1
        assert listed["creator_name"] == "Fixture User"
        assert listed["creator_avatar"] == "FU"

    @pytest.mark.asyncio
    async def test_join_request_is_visible_to_creator_and_can_be_approved(
        self,
        client: AsyncClient,
        test_session,
        user_headers: dict,
    ):
        from app.modules.users.models import User
        from app.security import create_access_token, hash_password

        requester = User(
            name="Join Requester",
            email="joinrequester@example.com",
            password_hash=hash_password("password123"),
            role="USER",
        )
        test_session.add(requester)
        await test_session.flush()
        requester_headers = {"Authorization": f"Bearer {create_access_token(str(requester.id), requester.role)}"}

        create_response = await client.post(
            "/api/trippods",
            json={"title": "Ujjain", "max_members": 4},
            headers=user_headers,
        )
        assert create_response.status_code == 201
        pod_id = create_response.json()["id"]

        own_request = await client.post(f"/api/trippods/{pod_id}/join-request", headers=user_headers)
        assert own_request.status_code == 400

        request_response = await client.post(f"/api/trippods/{pod_id}/join-request", headers=requester_headers)
        assert request_response.status_code == 200
        member_id = request_response.json()["member_id"]

        requester_list = await client.get("/api/trippods?page=1&per_page=100", headers=requester_headers)
        requested_pod = next(item for item in requester_list.json()["items"] if item["id"] == pod_id)
        assert requested_pod["my_member_status"] == "REQUESTED"

        creator_list = await client.get("/api/trippods?page=1&per_page=100", headers=user_headers)
        creator_pod = next(item for item in creator_list.json()["items"] if item["id"] == pod_id)
        assert creator_pod["pending_request_count"] == 1
        assert creator_pod["pending_requests"][0]["member_id"] == member_id
        assert creator_pod["pending_requests"][0]["user_name"] == "Join Requester"

        approve_response = await client.post(f"/api/trippods/{pod_id}/approve/{member_id}", headers=user_headers)
        assert approve_response.status_code == 200

        approved_list = await client.get("/api/trippods?page=1&per_page=100", headers=requester_headers)
        approved_pod = next(item for item in approved_list.json()["items"] if item["id"] == pod_id)
        assert approved_pod["my_member_status"] == "APPROVED"
        assert approved_pod["member_count"] == 2
