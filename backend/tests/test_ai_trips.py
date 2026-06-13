import pytest

from app.config import settings
from app.modules.places.models import Place
from app.modules.trips import ai_provider
from app.modules.trips.ai_provider import AIDay, AIItinerary, AISlot, TripPlanner, plan_trip

TRIP_REQUEST = {
    "destination": "Nowhereville",
    "days": 2,
    "budget": 10000,
    "peopleCount": 2,
    "tripType": "FRIENDS",
    "travelStyle": ["adventure"],
    "dietPreference": [],
}


def _fake_ai_itinerary() -> AIItinerary:
    slot = AISlot(activity="Sunrise trek", place_type="TREK", budget_share="30%")
    food = AISlot(activity="Dinner at Cafe X", food_match="Cafe X", budget_share="35%")
    return AIItinerary(
        summary="An AI-crafted adventure.",
        days=[
            AIDay(day=1, archetype="arrival", title="Day One", morning=slot, afternoon=slot, evening=food),
            AIDay(day=2, archetype="adventure", title="Day Two", morning=slot, afternoon=slot, evening=food),
        ],
    )


@pytest.fixture
def ai_enabled(monkeypatch):
    monkeypatch.setattr(settings, "AI_ENABLED", True)


class TestAITripGeneration:
    async def test_disabled_uses_rule_based_planner(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_ENABLED", False)
        result = await plan_trip(None, TRIP_REQUEST)
        assert result["aiGenerated"] is False
        assert len(result["itinerary"]) == 2

    async def test_ai_itinerary_used_when_enabled(self, monkeypatch, ai_enabled):
        async def fake_generate(prompt: str) -> AIItinerary:
            assert "Nowhereville" in prompt
            return _fake_ai_itinerary()

        monkeypatch.setattr(ai_provider, "_generate_ai_itinerary", fake_generate)
        result = await plan_trip(None, TRIP_REQUEST)
        assert result["aiGenerated"] is True
        assert result["summary"] == "An AI-crafted adventure."
        assert len(result["itinerary"]) == 2
        assert result["itinerary"][0]["slots"]["morning"]["activity"] == "Sunrise trek"
        # Rule-based outputs (budget, recommendations) are preserved
        assert result["estimatedBudget"]["total"] == 10000

    async def test_ai_failure_falls_back_to_rule_based(self, monkeypatch, ai_enabled):
        async def broken_generate(prompt: str) -> AIItinerary:
            raise RuntimeError("API down")

        monkeypatch.setattr(ai_provider, "_generate_ai_itinerary", broken_generate)
        result = await plan_trip(None, TRIP_REQUEST)
        assert result["aiGenerated"] is False
        assert len(result["itinerary"]) == 2
        assert result["summary"]  # heuristic summary still present


def _planner_with_known_places() -> TripPlanner:
    """A planner whose scored lists contain exactly the names the AI is allowed to use."""
    planner = TripPlanner(None, {**TRIP_REQUEST, "days": 2})
    planner.scored_places = [{"place": {"name": "Fort Aguada"}}, {"place": {"name": "Anjuna Beach"}}]
    planner.scored_food = [{"place": {"name": "Vinayak Family Restaurant"}}, {"place": {"name": "Bean Me Up"}}]
    return planner


def _day(n: int, food_match=None, shares=("30%", "40%", "30%")) -> AIDay:
    m = AISlot(activity="A", place_type="TREK", budget_share=shares[0])
    a = AISlot(activity="B", place_type="VIEWPOINT", budget_share=shares[1])
    e = AISlot(activity="C", food_match=food_match, budget_share=shares[2])
    return AIDay(day=n, archetype="arrival", title=f"Day {n}", morning=m, afternoon=a, evening=e)


class TestAIGuardrails:
    def test_wrong_day_count_is_rejected(self):
        planner = _planner_with_known_places()  # expects 2 days
        ai = AIItinerary(summary="x", days=[_day(1)])  # only 1
        with pytest.raises(ValueError, match="expected 2"):
            ai_provider._validate_and_repair(ai, planner)

    def test_empty_days_is_rejected(self):
        planner = _planner_with_known_places()
        with pytest.raises(ValueError):
            ai_provider._validate_and_repair(AIItinerary(summary="x", days=[]), planner)

    def test_invented_food_match_is_blanked(self):
        planner = _planner_with_known_places()
        ai = AIItinerary(summary="x", days=[_day(1, food_match="Totally Fake Diner"), _day(2)])
        repaired = ai_provider._validate_and_repair(ai, planner)
        assert repaired.days[0].evening.food_match is None

    def test_real_food_match_survives_with_trailing_context(self):
        planner = _planner_with_known_places()
        ai = AIItinerary(summary="x", days=[_day(1, food_match="Vinayak Family Restaurant, Goa"), _day(2)])
        repaired = ai_provider._validate_and_repair(ai, planner)
        assert repaired.days[0].evening.food_match == "Vinayak Family Restaurant, Goa"

    def test_drifted_budget_shares_are_renormalised(self):
        planner = _planner_with_known_places()
        # Day shares sum to 200% — should be scaled back to ~100%.
        ai = AIItinerary(summary="x", days=[_day(1, shares=("50%", "100%", "50%")), _day(2)])
        repaired = ai_provider._validate_and_repair(ai, planner)
        d = repaired.days[0]
        total = sum(int(s.budget_share.rstrip("%")) for s in (d.morning, d.afternoon, d.evening))
        assert abs(total - 100) <= 1

    def test_day_numbers_are_normalised_sequentially(self):
        planner = _planner_with_known_places()
        ai = AIItinerary(summary="x", days=[_day(7), _day(99)])
        repaired = ai_provider._validate_and_repair(ai, planner)
        assert [d.day for d in repaired.days] == [1, 2]

    def test_no_allowed_list_does_not_blank_food(self):
        # Thinly-seeded destination: nothing to validate against, so keep what we got.
        planner = TripPlanner(None, {**TRIP_REQUEST, "days": 1})
        ai = AIItinerary(summary="x", days=[_day(1, food_match="Some Place")])
        repaired = ai_provider._validate_and_repair(ai, planner)
        assert repaired.days[0].evening.food_match == "Some Place"


def _place(name: str, place_type: str) -> Place:
    return Place(name=name, type=place_type, slug=f"{name.lower().replace(' ', '-')}-t", latitude=1.0, longitude=1.0)


class TestTravelModeAndFuel:
    async def test_travel_mode_defaults_to_land(self):
        result = await plan_trip(None, TRIP_REQUEST)
        assert result["travelMode"] == "LAND"
        assert result["fuelStops"] == []

    async def test_invalid_mode_falls_back_to_land(self):
        result = await plan_trip(None, {**TRIP_REQUEST, "travelMode": "TELEPORT"})
        assert result["travelMode"] == "LAND"

    async def test_fuel_places_never_scored_as_attractions(self):
        planner = TripPlanner(None, TRIP_REQUEST)
        planner.all_places = [_place("IOCL Pump", "FUEL"), _place("Big Viewpoint", "VIEWPOINT")]
        planner._score_places()
        assert [p["place"]["name"] for p in planner.scored_places] == ["Big Viewpoint"]
        assert [f["name"] for f in planner.fuel_places] == ["IOCL Pump"]

    async def test_land_trip_includes_fuel_stops(self):
        planner = TripPlanner(None, {**TRIP_REQUEST, "travelMode": "LAND"})
        planner.all_places = [_place("IOCL Pump", "FUEL")]
        result = await planner.build()
        assert result["travelMode"] == "LAND"
        assert [f["name"] for f in result["fuelStops"]] == ["IOCL Pump"]

    async def test_air_trip_never_includes_fuel_stops(self):
        planner = TripPlanner(None, {**TRIP_REQUEST, "travelMode": "AIR"})
        planner.all_places = [_place("IOCL Pump", "FUEL")]
        result = await planner.build()
        assert result["travelMode"] == "AIR"
        assert result["fuelStops"] == []

    async def test_water_trip_never_includes_fuel_stops(self):
        planner = TripPlanner(None, {**TRIP_REQUEST, "travelMode": "WATER"})
        planner.all_places = [_place("IOCL Pump", "FUEL")]
        result = await planner.build()
        assert result["travelMode"] == "WATER"
        assert result["fuelStops"] == []

    async def test_train_is_land_but_never_includes_fuel_stops(self):
        # A train is land travel, yet the passenger never refuels — no fuel stops.
        planner = TripPlanner(None, {**TRIP_REQUEST, "travelMode": "TRAIN"})
        planner.all_places = [_place("IOCL Pump", "FUEL")]
        result = await planner.build()
        assert result["travelMode"] == "TRAIN"
        assert result["fuelStops"] == []

    async def test_car_transport_includes_fuel_stops(self):
        planner = TripPlanner(None, {**TRIP_REQUEST, "travelMode": "CAR"})
        planner.all_places = [_place("IOCL Pump", "FUEL")]
        result = await planner.build()
        assert result["travelMode"] == "CAR"
        assert [f["name"] for f in result["fuelStops"]] == ["IOCL Pump"]
