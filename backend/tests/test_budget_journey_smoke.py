import pytest


@pytest.mark.asyncio
async def test_budget_lifecycle(client, user_headers):
    # Empty to start.
    r = await client.get("/api/budget", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["total"] == 0

    # Add two expenses and check computed settle-up.
    r = await client.post("/api/budget/expenses", headers=user_headers, json={
        "description": "Hotel", "amount": 3000, "category": "Stay",
        "paid_by": "You", "split": ["You", "A", "B"],
    })
    assert r.status_code == 201
    r = await client.post("/api/budget/expenses", headers=user_headers, json={
        "description": "Lunch", "amount": 600, "category": "Food",
        "paid_by": "A", "split": ["You", "A", "B"],
    })
    assert r.status_code == 201
    body = r.json()
    assert body["total"] == 3600
    assert body["per_person"] == 1200
    assert set(body["members"]) == {"You", "A", "B"}
    # B owes the most; settle-up should route money to "You".
    tos = {s["to"] for s in body["settlements"]}
    assert "You" in tos

    # Delete one and re-check.
    eid = body["expenses"][0]["id"]
    r = await client.delete(f"/api/budget/expenses/{eid}", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["total"] == 600


@pytest.mark.asyncio
async def test_journey_saved_to_history(client, user_headers):
    r = await client.post("/api/trips/journey", headers=user_headers, json={
        "origin": "Ratlam", "destination": "Indore", "roundTrip": False, "peopleCount": 2,
    })
    assert r.status_code == 200, r.text
    jid = r.json().get("id")
    assert jid

    r = await client.get("/api/trips/journeys", headers=user_headers)
    assert r.status_code == 200
    assert any(j["id"] == jid for j in r.json())

    r = await client.get(f"/api/trips/journeys/{jid}", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ready"
