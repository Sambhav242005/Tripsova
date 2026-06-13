import uuid
from datetime import datetime, timezone

import pytest

from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.trips.route_planner import FUEL_INTERVAL_KM, haversine_km, plan_route

DELHI = {"name": "Delhi", "latitude": 28.6139, "longitude": 77.2090}
MUMBAI = {"name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777}
DEPARTURE = datetime(2026, 6, 15, 8, 0, tzinfo=timezone.utc)


@pytest.fixture
async def midway_city(test_session):
    dest = Destination(
        name="Midway City",
        slug=f"midway-city-{uuid.uuid4().hex[:8]}",
        latitude=24.0,
        longitude=75.0,
    )
    test_session.add(dest)
    await test_session.flush()
    hotel = Place(
        destination_id=dest.id,
        name="Midway Grand Hotel",
        type="HOTEL",
        slug=f"midway-grand-{uuid.uuid4().hex[:8]}",
        latitude=24.0,
        longitude=75.0,
        tripova_score=80,
    )
    test_session.add(hotel)
    await test_session.flush()
    return dest


class TestHaversine:
    def test_known_distance(self):
        # Delhi–Mumbai straight line is roughly 1150 km
        d = haversine_km(DELHI["latitude"], DELHI["longitude"], MUMBAI["latitude"], MUMBAI["longitude"])
        assert 1100 < d < 1220


class TestLandRoute:
    async def test_multi_day_drive_with_overnight_stops(self, test_session, midway_city):
        result = await plan_route(test_session, {
            "origin": DELHI,
            "destination": MUMBAI,
            "travelMode": "LAND",
            "departureTime": DEPARTURE,
        })

        assert result["travelMode"] == "LAND"
        # ~1440 km route at ~50 km/h with 9h driving days → 3-5 day segments
        assert 3 <= len(result["segments"]) <= 5
        assert len(result["overnightStops"]) == len(result["segments"]) - 1
        assert result["estimatedDurationHours"] > 24

        # Every segment carries coordinates + ISO times for the map timeline
        for seg in result["segments"]:
            assert "latitude" in seg["startPoint"] and "longitude" in seg["endPoint"]
            assert datetime.fromisoformat(seg["startTime"]) < datetime.fromisoformat(seg["endTime"])

        # Overnight stops: nearest city + the three traveller choices
        stop = result["overnightStops"][0]
        assert stop["nearestCity"]["name"] == "Midway City"
        option_types = {o["type"] for o in stop["options"]}
        assert option_types == {"BOOK_HOTEL", "STAY_WITH_RELATIVES", "CONTINUE"}
        hotel_option = next(o for o in stop["options"] if o["type"] == "BOOK_HOTEL")
        assert any(h["name"] == "Midway Grand Hotel" for h in hotel_option["hotels"])

        # Evening cutoff: driving never runs past 20:00
        for stop in result["overnightStops"]:
            assert datetime.fromisoformat(stop["arrivalTime"]).hour <= 20

    async def test_fuel_stops_every_interval(self, test_session):
        result = await plan_route(test_session, {
            "origin": DELHI,
            "destination": MUMBAI,
            "travelMode": "LAND",
            "departureTime": DEPARTURE,
        })
        expected = int(result["distanceKm"] // FUEL_INTERVAL_KM)
        assert len(result["fuelStops"]) == expected >= 2
        for fs in result["fuelStops"]:
            assert fs["estimatedTime"] is not None
            assert "latitude" in fs["location"]

    async def test_short_hop_has_no_overnight_or_fuel_stops(self, test_session):
        nearby = {"name": "Gurgaon", "latitude": 28.4595, "longitude": 77.0266}
        result = await plan_route(test_session, {
            "origin": DELHI,
            "destination": nearby,
            "travelMode": "LAND",
            "departureTime": DEPARTURE,
        })
        assert len(result["segments"]) == 1
        assert result["overnightStops"] == []
        assert result["fuelStops"] == []


class TestAirAndWaterRoutes:
    async def test_air_is_single_segment_no_fuel_no_overnight(self, test_session):
        result = await plan_route(test_session, {
            "origin": DELHI,
            "destination": MUMBAI,
            "travelMode": "AIR",
            "departureTime": DEPARTURE,
        })
        assert result["travelMode"] == "AIR"
        assert len(result["segments"]) == 1
        assert result["fuelStops"] == []
        assert result["overnightStops"] == []
        assert result["estimatedDurationHours"] < 10

    async def test_water_is_single_segment_no_fuel(self, test_session):
        result = await plan_route(test_session, {
            "origin": {"name": "Mumbai Port", "latitude": 18.95, "longitude": 72.85},
            "destination": {"name": "Goa Port", "latitude": 15.41, "longitude": 73.80},
            "travelMode": "WATER",
            "departureTime": DEPARTURE,
        })
        assert result["travelMode"] == "WATER"
        assert len(result["segments"]) == 1
        assert result["fuelStops"] == []

    async def test_invalid_mode_falls_back_to_land(self, test_session):
        result = await plan_route(test_session, {
            "origin": DELHI,
            "destination": MUMBAI,
            "travelMode": "TELEPORT",
            "departureTime": DEPARTURE,
        })
        assert result["travelMode"] == "LAND"


KYOTO = {"name": "Kyoto", "latitude": 35.0116, "longitude": 135.7681}
TOKYO = {"name": "Tokyo", "latitude": 35.6762, "longitude": 139.6503}
NARA = {"name": "Nara", "latitude": 34.6851, "longitude": 135.8048}


class TestTransports:
    async def test_train_has_no_fuel_or_overnight_road_stops(self, test_session):
        # A train is "land" but you don't refuel it and you don't sleep on the roadside.
        result = await plan_route(test_session, {
            "origin": DELHI, "destination": MUMBAI, "transport": "TRAIN", "departureTime": DEPARTURE,
        })
        assert result["transport"] == "TRAIN"
        assert result["medium"] == "LAND"
        assert result["fuelStops"] == []
        assert result["overnightStops"] == []
        assert len(result["segments"]) == 1  # one continuous scheduled segment

    async def test_bus_is_single_scheduled_segment(self, test_session):
        result = await plan_route(test_session, {
            "origin": DELHI, "destination": MUMBAI, "transport": "BUS", "departureTime": DEPARTURE,
        })
        assert result["transport"] == "BUS"
        assert result["fuelStops"] == []
        assert result["overnightStops"] == []

    async def test_motorcycle_refuels_more_often_than_car(self, test_session):
        car = await plan_route(test_session, {
            "origin": DELHI, "destination": MUMBAI, "transport": "CAR", "departureTime": DEPARTURE,
        })
        moto = await plan_route(test_session, {
            "origin": DELHI, "destination": MUMBAI, "transport": "MOTORCYCLE", "departureTime": DEPARTURE,
        })
        assert len(moto["fuelStops"]) > len(car["fuelStops"])  # 250km tank vs 450km

    async def test_bicycle_rests_overnight_but_never_refuels(self, test_session, midway_city):
        result = await plan_route(test_session, {
            "origin": DELHI, "destination": MUMBAI, "transport": "BICYCLE", "departureTime": DEPARTURE,
        })
        assert result["transport"] == "BICYCLE"
        assert result["fuelStops"] == []            # human-powered: never refuels
        assert len(result["overnightStops"]) > 0    # but does stop to sleep


class TestMultiLeg:
    async def test_japan_trip_chains_modes_with_per_leg_rules(self, test_session, midway_city):
        # Fly to Tokyo, train to Kyoto, drive to Nara: only the CAR leg gets fuel + overnight.
        result = await plan_route(test_session, {
            "departureTime": DEPARTURE,
            "legs": [
                {"origin": MUMBAI, "destination": TOKYO, "transport": "FLIGHT"},
                {"origin": TOKYO, "destination": KYOTO, "transport": "TRAIN"},
                {"origin": KYOTO, "destination": NARA, "transport": "CAR"},
            ],
        })
        assert result["travelMode"] == "MULTI"
        assert result["medium"] == "MIXED"
        assert len(result["legs"]) == 3
        assert [l["transport"] for l in result["legs"]] == ["FLIGHT", "TRAIN", "CAR"]

        # Fuel + overnight stops belong only to the CAR leg (index 2).
        assert all(fs["legIndex"] == 2 for fs in result["fuelStops"])
        assert all(os["legIndex"] == 2 for os in result["overnightStops"])

        # The clock chains: each leg departs at/after the previous leg's arrival.
        arrivals = [datetime.fromisoformat(l["arrivalTime"]) for l in result["legs"]]
        departures = [datetime.fromisoformat(l["departureTime"]) for l in result["legs"]]
        assert departures[1] >= arrivals[0]
        assert departures[2] >= arrivals[1]
        assert datetime.fromisoformat(result["arrivalTime"]) == arrivals[-1]

    async def test_multi_leg_via_endpoint(self, client, user_headers):
        resp = await client.post("/api/trips/route-plan", json={
            "departureTime": DEPARTURE.isoformat(),
            "legs": [
                {"origin": MUMBAI, "destination": TOKYO, "transport": "FLIGHT"},
                {"origin": TOKYO, "destination": KYOTO, "transport": "TRAIN"},
            ],
        }, headers=user_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["travelMode"] == "MULTI"
        assert len(body["legs"]) == 2
        assert body["fuelStops"] == []  # flight + train: nothing to refuel

    async def test_request_without_route_is_rejected(self, client, user_headers):
        resp = await client.post("/api/trips/route-plan", json={"departureTime": DEPARTURE.isoformat()},
                                 headers=user_headers)
        assert resp.status_code == 422  # neither legs nor origin/destination


class TestRoutePlanEndpoint:
    async def test_route_plan_requires_auth(self, client):
        resp = await client.post("/api/trips/route-plan", json={
            "origin": DELHI, "destination": MUMBAI, "travelMode": "AIR",
        })
        assert resp.status_code in (401, 403)

    async def test_route_plan_endpoint(self, client, user_headers):
        resp = await client.post(
            "/api/trips/route-plan",
            json={
                "origin": DELHI,
                "destination": MUMBAI,
                "travelMode": "AIR",
                "departureTime": DEPARTURE.isoformat(),
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["travelMode"] == "AIR"
        assert body["fuelStops"] == []
        assert body["segments"][0]["startPoint"]["latitude"] == pytest.approx(DELHI["latitude"], abs=0.01)
        assert datetime.fromisoformat(body["arrivalTime"]) > datetime.fromisoformat(body["departureTime"])

    async def test_route_not_saved_by_default(self, client, user_headers):
        resp = await client.post("/api/trips/route-plan", json={
            "origin": DELHI, "destination": MUMBAI, "travelMode": "AIR",
            "departureTime": DEPARTURE.isoformat(),
        }, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["tripId"] is None  # compute-only, nothing persisted

    async def test_route_can_be_saved_as_trip(self, client, user_headers):
        resp = await client.post("/api/trips/route-plan", json={
            "origin": DELHI, "destination": MUMBAI, "travelMode": "AIR",
            "departureTime": DEPARTURE.isoformat(), "save": True,
        }, headers=user_headers)
        assert resp.status_code == 200
        trip_id = resp.json()["tripId"]
        assert trip_id  # a trip was created

        # The saved trip now carries the route under generated_plan["route"].
        got = await client.get(f"/api/trips/{trip_id}")
        assert got.status_code == 200
        assert got.json()["generated_plan"]["route"]["travelMode"] == "AIR"

    async def test_route_can_attach_to_existing_trip(self, client, user_headers):
        # Create a trip via the generator, then attach a route to it.
        gen = await client.post("/api/trips/generate", json={
            "destination": "Delhi", "days": 2, "budget": 5000,
            "peopleCount": 1, "tripType": "SOLO",
        }, headers=user_headers)
        assert gen.status_code == 200
        trip_id = gen.json()["tripId"]

        resp = await client.post("/api/trips/route-plan", json={
            "origin": DELHI, "destination": MUMBAI, "travelMode": "AIR",
            "departureTime": DEPARTURE.isoformat(), "tripId": trip_id,
        }, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["tripId"] == trip_id

        got = await client.get(f"/api/trips/{trip_id}")
        assert got.json()["generated_plan"]["route"]["travelMode"] == "AIR"
