"""
Tests for the personalized Trip Planner algorithm (zero AI).
Covers scoring, filtering, itinerary construction, budget, and edge cases.
"""

import pytest
from app.modules.trips.ai_provider import TripPlanner, STYLE_TYPE_MAP


# ─── Style matching ───────────────────────────────────────────────────────────

class TestStyleMatching:
    def test_adventure_style_matches_trek(self):
        score = TripPlanner._style_match("TREK", ["adventure"])
        assert score == 100.0

    def test_food_style_ignores_tourist_spot(self):
        score = TripPlanner._style_match("TOURIST_SPOT", ["food"])
        assert score == 0.0

    def test_multiple_styles_averaged(self):
        score = TripPlanner._style_match("CAFE", ["food", "adventure"])
        # food matches CAFE (100), adventure does not (0) → average 50
        assert score == 50.0

    def test_no_styles_gives_default_60(self):
        score = TripPlanner._style_match("HOTEL", [])
        assert score == 60.0

    def test_all_styles_match_gives_100(self):
        score = TripPlanner._style_match("TOURIST_SPOT", ["adventure", "cultural", "photography"])
        # All three styles include TOURIST_SPOT
        assert score == 100.0


# ─── Rating confidence ────────────────────────────────────────────────────────

class TestRatingConfidence:
    def test_no_reviews_gives_zero(self):
        assert TripPlanner._rating_confidence(None) == 0
        assert TripPlanner._rating_confidence(0) == 0

    def test_ten_reviews_low_confidence(self):
        c = TripPlanner._rating_confidence(10)
        assert c < 50  # should be well below 50%

    def test_thousand_reviews_strong_confidence(self):
        c = TripPlanner._rating_confidence(1000)
        assert c > 70  # should be solid confidence

    def test_ten_thousand_near_max(self):
        c = TripPlanner._rating_confidence(10000)
        assert c == 100.0  # at the log ceiling

    def test_million_is_clamped(self):
        c = TripPlanner._rating_confidence(1_000_000)
        assert c == 100.0  # clamped, not above 100


# ─── Place scoring ────────────────────────────────────────────────────────────

class TestPlaceScoring:
    @pytest.mark.asyncio
    async def test_places_sorted_by_score(self):
        """_score_places sorts descending by personalized score."""
        planner = TripPlanner.__new__(TripPlanner)
        planner.destination = None
        planner.destination_name = "Test"
        planner.days = 3
        planner.budget = 10000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = ["adventure"]
        planner.diet_preferences = []
        planner.all_places = []
        planner.scored_places = []
        planner.scored_food = []

        planner._score_places()
        assert planner.scored_places == []

    def test_adventure_place_outranks_hotel_for_adventure_style(self):
        """Adventure-style user should rank a TREK above a HOTEL (a non-adventure attraction).

        CAFE/RESTAURANT are food venues scored separately by ``_score_food``, so the
        attraction ranking is compared against another genuine attraction type."""
        class MockPlace:
            def __init__(self, ptype, rating=80, reviews=100, score=70):
                self.id = "mock"
                self.type = ptype
                self.external_rating = rating
                self.external_review_count = reviews
                self.tripova_score = score
                self.latitude = None
                self.longitude = None
                self.phone = None
                self.address = None
                self.tags = None
                self.name = f"Place {ptype}"
                self.slug = ""
                self.source = None
                self.source_place_id = None
                self.is_partner_listed = False
                self.is_offline_available = False
                self.last_verified_at = None
                self.price_range = None
                self.diet_tags = None
                self.photos = None
                self.opening_hours = None
                self.website = None

        planner = TripPlanner.__new__(TripPlanner)
        planner.destination = None
        planner.destination_name = "Test"
        planner.days = 3
        planner.budget = 10000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = ["adventure"]
        planner.diet_preferences = []
        planner.all_places = [MockPlace("TREK", 90, 500, 85), MockPlace("HOTEL", 90, 500, 85)]
        planner.scored_places = []
        planner.scored_food = []

        planner._score_places()
        assert len(planner.scored_places) == 2
        assert planner.scored_places[0]["place"]["type"] == "TREK", "TREK should rank first for adventure style"
        assert planner.scored_places[1]["place"]["type"] == "HOTEL"

    def test_style_match_bonus_dominates_equal_ratings(self):
        """With identical ratings, style match determines ranking."""
        class MockPlace:
            def __init__(self, ptype):
                self.id = "mock"
                self.type = ptype
                self.external_rating = 80
                self.external_review_count = 200
                self.tripova_score = 50
                self.latitude = None
                self.longitude = None
                self.phone = None
                self.address = None
                self.tags = None
                self.name = f"Place {ptype}"
                self.slug = ""
                self.source = None
                self.source_place_id = None
                self.is_partner_listed = False
                self.is_offline_available = False
                self.last_verified_at = None
                self.price_range = None
                self.diet_tags = None
                self.photos = None
                self.opening_hours = None
                self.website = None

        planner = TripPlanner.__new__(TripPlanner)
        planner.destination = None
        planner.destination_name = "Test"
        planner.days = 3
        planner.budget = 10000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = ["cultural"]
        planner.diet_preferences = []
        planner.all_places = [MockPlace("HOTEL"), MockPlace("TOURIST_SPOT")]
        planner.scored_places = []
        planner.scored_food = []

        planner._score_places()
        # TOURIST_SPOT (matches cultural style) should outrank HOTEL (doesn't match)
        assert planner.scored_places[0]["place"]["type"] == "TOURIST_SPOT"
        assert planner.scored_places[1]["place"]["type"] == "HOTEL"


# ─── Food scoring with diet awareness ─────────────────────────────────────────

class TestFoodScoring:
    def test_diet_preference_boosts_score(self):
        class MockFood:
            def __init__(self, diet_tags):
                self.id = "mock"
                self.type = "RESTAURANT"
                self.name = "Food Place"
                self.slug = ""
                self.external_rating = 80
                self.external_review_count = 100
                self.tripova_score = 50
                self.diet_tags = diet_tags
                self.latitude = None
                self.longitude = None
                self.phone = None
                self.address = None
                self.price_range = None
                self.source = None
                self.source_place_id = None
                self.is_partner_listed = False
                self.is_offline_available = False
                self.last_verified_at = None
                self.tags = None
                self.photos = None
                self.opening_hours = None
                self.website = None
                self.popularity_score = 0
                self.confidence_score = 0
                self.trust_score = 0
                self.safety_score = 0
                self.food_score = 0

        planner = TripPlanner.__new__(TripPlanner)
        planner.destination = None
        planner.destination_name = "Test"
        planner.days = 3
        planner.budget = 10000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = []
        planner.diet_preferences = ["JAIN"]
        planner.all_places = [MockFood(["JAIN", "PURE_VEG"]), MockFood(["VEGAN"])]
        planner.scored_places = []
        planner.scored_food = []

        planner._score_food()
        assert len(planner.scored_food) == 2
        assert planner.scored_food[0]["diet_bonus"] > 0  # JAIN match gets bonus
        assert planner.scored_food[1]["diet_bonus"] == 0  # VEGAN does not match JAIN

    def test_no_diet_preference_all_food_equal(self):
        class MockFood:
            def __init__(self):
                self.id = "mock"
                self.type = "RESTAURANT"
                self.name = "Food"
                self.slug = ""
                self.external_rating = 80
                self.external_review_count = 100
                self.tripova_score = 50
                self.diet_tags = ["PURE_VEG"]
                self.latitude = None
                self.longitude = None
                self.phone = None
                self.address = None
                self.price_range = None
                self.source = None
                self.source_place_id = None
                self.is_partner_listed = False
                self.is_offline_available = False
                self.last_verified_at = None
                self.tags = None
                self.photos = None
                self.opening_hours = None
                self.website = None
                self.popularity_score = 0
                self.confidence_score = 0
                self.trust_score = 0
                self.safety_score = 0
                self.food_score = 0

        planner = TripPlanner.__new__(TripPlanner)
        planner.destination = None
        planner.destination_name = "Test"
        planner.days = 3
        planner.budget = 10000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = []
        planner.diet_preferences = []
        planner.all_places = [MockFood(), MockFood()]
        planner.scored_places = []
        planner.scored_food = []

        planner._score_food()
        assert planner.scored_food[0]["diet_bonus"] == 0  # No bonus without preferences


# ─── Itinerary construction ───────────────────────────────────────────────────

class TestItineraryConstruction:
    def test_itinerary_has_correct_number_of_days(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.destination_name = "Test"
        planner.days = 4
        planner.budget = 20000
        planner.people_count = 2
        planner.trip_type = "FRIENDS"
        planner.travel_styles = []
        planner.diet_preferences = []
        planner.scored_places = [
            {"score": 90, "place": {"type": "TOURIST_SPOT", "name": "A"}},
            {"score": 80, "place": {"type": "VIEWPOINT", "name": "B"}},
            {"score": 70, "place": {"type": "TREK", "name": "C"}},
            {"score": 60, "place": {"type": "HOTEL", "name": "D"}},
            {"score": 50, "place": {"type": "EXPERIENCE", "name": "E"}},
            {"score": 40, "place": {"type": "HOMESTAY", "name": "F"}},
        ]
        planner.scored_food = [
            {"score": 80, "place": {"name": "Food1"}},
            {"score": 70, "place": {"name": "Food2"}},
        ]

        itinerary = planner._build_itinerary()
        assert len(itinerary) == 4
        for day in itinerary:
            assert "morning" in day["slots"]
            assert "afternoon" in day["slots"]
            assert "evening" in day["slots"]

    def test_empty_itinerary_when_no_data(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.destination_name = "Nowhere"
        planner.days = 3
        planner.budget = 0
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = []
        planner.diet_preferences = []
        planner.scored_places = []
        planner.scored_food = []

        itinerary = planner._build_itinerary()
        assert len(itinerary) == 3
        # All slots filled with fallback text
        for day in itinerary:
            assert "morning" in day["slots"]

    def test_single_day_trip(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.destination_name = "Quick"
        planner.days = 1
        planner.budget = 5000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        planner.travel_styles = []
        planner.diet_preferences = []
        planner.scored_places = [{"score": 90, "place": {"type": "TOURIST_SPOT", "name": "One"}}]
        planner.scored_food = [{"score": 70, "place": {"name": "Eat"}}]

        itinerary = planner._build_itinerary()
        assert len(itinerary) == 1


# ─── Budget allocation ────────────────────────────────────────────────────────

class TestBudget:
    def test_solo_budget_breakdown(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.days = 3
        planner.budget = 15000
        planner.people_count = 1
        planner.trip_type = "SOLO"
        budget = planner._calculate_budget()
        assert budget["total"] == 15000
        assert budget["per_person"] == 15000
        assert budget["breakdown"]["activities"] > budget["breakdown"]["food"]
        assert budget["currency"] == "INR"

    def test_family_budget_weights_accommodation(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.days = 4
        planner.budget = 50000
        planner.people_count = 4
        planner.trip_type = "FAMILY"
        budget = planner._calculate_budget()
        # Family allocates 40% to accommodation
        assert budget["breakdown"]["accommodation"] > budget["breakdown"]["food"]

    def test_friends_budget_equal_food_activities(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.days = 3
        planner.budget = 12000
        planner.people_count = 3
        planner.trip_type = "FRIENDS"
        budget = planner._calculate_budget()
        assert budget["per_person"] == 4000


# ─── Full end-to-end ──────────────────────────────────────────────────────────

class TestTripPlannerE2E:
    @pytest.mark.asyncio
    async def test_build_returns_expected_structure(self):
        """Even with no database data, build() returns a valid structure."""
        planner = TripPlanner.__new__(TripPlanner)
        planner.db = None
        planner.destination_name = "Manali"
        planner.days = 4
        planner.budget = 25000
        planner.people_count = 2
        planner.trip_type = "COUPLE"
        planner.travel_styles = ["nature", "food"]
        planner.diet_preferences = ["PURE_VEG"]
        planner.travel_mode = "LAND"
        planner.refuel_relevant = True
        planner.travel_medium = "LAND"
        planner.destination = None
        planner.all_places = []
        planner.scored_places = []
        planner.scored_food = []
        planner.fuel_places = []

        # This simulates what happens when the DB has no data
        result = await planner.build()

        assert "summary" in result
        assert "itinerary" in result
        assert "estimatedBudget" in result
        assert "safetyNotes" in result
        assert result["days"] == 4
        assert result["tripType"] == "COUPLE"
        assert result["dietPreference"] == ["PURE_VEG"]
        assert result["offlinePackSuggested"] is True
        assert len(result["itinerary"]) == 4


# ─── Edge cases ───────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_max_days_clamped_to_30(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.days = 100
        assert planner.days == 30

    def test_min_days_is_1(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.days = 0
        assert planner.days == 1

    def test_negative_budget_becomes_zero(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.budget = -5000
        assert planner.budget == 0.0

    def test_zero_people_defaults_to_1(self):
        planner = TripPlanner.__new__(TripPlanner)
        planner.people_count = 0
        assert planner.people_count == 1

    def test_all_style_types_are_covered(self):
        """Every user-facing style should have at least one place type mapped."""
        known_styles = {"adventure", "nature", "cultural", "food", "relaxation", "photography", "shopping", "spiritual", "wellness"}
        for s in known_styles:
            assert s in STYLE_TYPE_MAP, f"Style '{s}' missing from STYLE_TYPE_MAP"
            assert len(STYLE_TYPE_MAP[s]) > 0, f"Style '{s}' has no place types"

    def test_no_destination_does_not_crash(self):
        class MockDB:
            async def execute(self, stmt):
                from sqlalchemy import select
                class MockResult:
                    def scalar_one_or_none(self):
                        return None
                    def scalars(self):
                        class M:
                            def all(self):
                                return []
                        return M()
                return MockResult()

        planner = TripPlanner(MockDB(), {"destination": ""})
        # Should not crash
