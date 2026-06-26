import pytest

from app.modules.trips import journey_planner
from app.modules.trips.journey_planner import choose_legs, plan_journey
from app.modules.trips.route_planner import haversine_km
from app.modules.trips.transport import leg_cost

# Real-ish coordinates used across the cases.
RATLAM = {"name": "Ratlam", "latitude": 23.3315, "longitude": 75.0367, "source": "nominatim"}
MUMBAI = {"name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777, "source": "db"}
INDORE = {"name": "Indore", "latitude": 22.7196, "longitude": 75.8577, "source": "nominatim"}
DELHI = {"name": "Delhi", "latitude": 28.6139, "longitude": 77.2090, "source": "db"}

# Fake OSM hubs so the planner never hits the live Overpass network in tests. Each is a
# real hub placed near its city; the fake lookup returns the nearest one with distanceKm
# attached, exactly like the live hubs module does.
_FAKE_STATIONS = [
    {"name": "Ratlam Junction (RTM)", "latitude": 23.3300, "longitude": 75.0400},
    {"name": "Mumbai Central (MMCT)", "latitude": 18.9696, "longitude": 72.8194},
    {"name": "Indore Junction (INDB)", "latitude": 22.7180, "longitude": 75.8650},
]
_FAKE_AIRPORTS = [
    {"name": "Indira Gandhi International Airport (DEL)", "latitude": 28.5562, "longitude": 77.1000},
    {"name": "Chhatrapati Shivaji Maharaj International Airport (BOM)", "latitude": 19.0896, "longitude": 72.8656},
]


def _nearest_fake(catalog):
    async def _lookup(point):
        if point is None or point.get("latitude") is None:
            return None
        lat, lng = point["latitude"], point["longitude"]
        best, best_km = None, None
        for hub in catalog:
            km = haversine_km(lat, lng, hub["latitude"], hub["longitude"])
            if best_km is None or km < best_km:
                best, best_km = hub, km
        return {**best, "distanceKm": round(best_km, 1)}

    return _lookup


@pytest.fixture(autouse=True)
def fake_hubs(monkeypatch):
    """Patch the hub lookups so tests are deterministic and never touch the network."""
    monkeypatch.setattr(journey_planner, "nearest_station", _nearest_fake(_FAKE_STATIONS))
    monkeypatch.setattr(journey_planner, "nearest_airport", _nearest_fake(_FAKE_AIRPORTS))


class TestChooseLegs:
    async def test_short_hop_picks_car(self):
        # Ratlam -> Indore is ~100 km
        legs = await choose_legs(RATLAM, INDORE)
        assert [l["transport"] for l in legs] == ["CAR"]

    async def test_medium_hop_picks_train(self):
        # Ratlam -> Mumbai is ~480 km straight line; both stations sit inside their
        # cities (within HUB_SKIP_KM), so the access legs fall away → a single TRAIN leg.
        legs = await choose_legs(RATLAM, MUMBAI)
        assert [l["transport"] for l in legs] == ["TRAIN"]

    async def test_train_leg_snaps_to_real_stations(self):
        # The train leg should depart/arrive at named railway stations (with codes),
        # not the bare city centres.
        legs = await choose_legs(RATLAM, MUMBAI)
        train = next(l for l in legs if l["transport"] == "TRAIN")
        assert "(" in train["origin"]["name"] and ")" in train["origin"]["name"]
        assert "(" in train["destination"]["name"] and ")" in train["destination"]["name"]
        assert train["origin"]["name"].startswith("Ratlam")
        # Endpoints are the station coordinates, not the original city coordinates.
        assert (train["origin"]["latitude"], train["origin"]["longitude"]) != (
            RATLAM["latitude"], RATLAM["longitude"],
        )

    async def test_long_hop_builds_drive_fly_drive(self):
        # Delhi -> Mumbai is ~1150 km → fly, with a drive to/from the nearest airport
        legs = await choose_legs(DELHI, MUMBAI)
        modes = [l["transport"] for l in legs]
        assert "FLIGHT" in modes
        assert modes[0] == "CAR" or modes[0] == "FLIGHT"  # drive-in only if not already at airport
        # The flight leg connects two different airports
        flight = next(l for l in legs if l["transport"] == "FLIGHT")
        assert flight["origin"]["name"] != flight["destination"]["name"]


class TestLegCost:
    def test_ticketed_cost_scales_with_people(self):
        one = leg_cost("TRAIN", 400, 1)
        four = leg_cost("TRAIN", 400, 4)
        assert four == pytest.approx(one * 4)

    def test_car_cost_is_per_vehicle_not_per_head(self):
        # 4 people share one car (seats=4) → same cost as 1 person
        assert leg_cost("CAR", 300, 4) == leg_cost("CAR", 300, 1)
        # 5 people need a second car → strictly more
        assert leg_cost("CAR", 300, 5) > leg_cost("CAR", 300, 4)


class TestPlanJourney:
    @pytest.fixture
    def fake_geocode(self, monkeypatch):
        table = {"ratlam": RATLAM, "mumbai": MUMBAI, "delhi": DELHI}

        async def _fake(db, name):
            key = name.strip().lower()
            if key not in table:
                from app.modules.trips.geocode import GeocodeError
                raise GeocodeError(f"Could not locate '{name}'.")
            return table[key]

        monkeypatch.setattr(journey_planner, "geocode_city", _fake)

    async def test_ratlam_to_mumbai_one_way(self, fake_geocode):
        result = await plan_journey(None, {"origin": "Ratlam", "destination": "Mumbai", "peopleCount": 2})
        assert result["roundTrip"] is False
        assert result["chosenModes"] == ["TRAIN"]
        assert result["cost"]["total"] > 0
        assert result["cost"]["perPerson"] == pytest.approx(result["cost"]["total"] / 2)
        # geocoding provenance is surfaced
        assert result["geocoding"]["destination"]["source"] == "db"

    async def test_round_trip_doubles_the_legs(self, fake_geocode):
        one = await plan_journey(None, {"origin": "Ratlam", "destination": "Mumbai"})
        rt = await plan_journey(None, {"origin": "Ratlam", "destination": "Mumbai", "roundTrip": True})
        assert rt["roundTrip"] is True
        assert len(rt["route"]["legs"]) == 2 * len(one["route"]["legs"])
        assert rt["cost"]["total"] == pytest.approx(2 * one["cost"]["total"])

    async def test_budget_flag(self, fake_geocode):
        cheap = await plan_journey(None, {"origin": "Ratlam", "destination": "Mumbai", "budget": 1})
        rich = await plan_journey(None, {"origin": "Ratlam", "destination": "Mumbai", "budget": 10_000_000})
        assert cheap["withinBudget"] is False
        assert rich["withinBudget"] is True

    async def test_long_trip_chooses_flight(self, fake_geocode):
        result = await plan_journey(None, {"origin": "Delhi", "destination": "Mumbai"})
        assert "FLIGHT" in result["chosenModes"]

    async def test_unknown_city_raises_geocode_error(self, fake_geocode):
        from app.modules.trips.geocode import GeocodeError
        with pytest.raises(GeocodeError):
            await plan_journey(None, {"origin": "Atlantis", "destination": "Mumbai"})
