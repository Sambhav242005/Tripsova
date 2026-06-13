import pytest

from app.modules.trips import journey_planner
from app.modules.trips.journey_planner import choose_legs, plan_journey
from app.modules.trips.transport import leg_cost

# Real-ish coordinates used across the cases.
RATLAM = {"name": "Ratlam", "latitude": 23.3315, "longitude": 75.0367, "source": "nominatim"}
MUMBAI = {"name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777, "source": "db"}
INDORE = {"name": "Indore", "latitude": 22.7196, "longitude": 75.8577, "source": "nominatim"}
DELHI = {"name": "Delhi", "latitude": 28.6139, "longitude": 77.2090, "source": "db"}


class TestChooseLegs:
    def test_short_hop_picks_car(self):
        # Ratlam -> Indore is ~100 km
        legs = choose_legs(RATLAM, INDORE)
        assert [l["transport"] for l in legs] == ["CAR"]

    def test_medium_hop_picks_train(self):
        # Ratlam -> Mumbai is ~480 km straight line
        legs = choose_legs(RATLAM, MUMBAI)
        assert [l["transport"] for l in legs] == ["TRAIN"]

    def test_long_hop_builds_drive_fly_drive(self):
        # Delhi -> Mumbai is ~1150 km → fly, with a drive to/from the nearest airport
        legs = choose_legs(DELHI, MUMBAI)
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
