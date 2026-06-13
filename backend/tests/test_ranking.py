import pytest

from app.modules.places.ranking import (
    compose_final_score,
    freshness_score_from_days,
    popularity_score,
    review_confidence_score,
)


def _score(**overrides) -> float:
    """compose_final_score with neutral defaults; returns just the score."""
    kwargs = dict(
        popularity=80,
        trust_score=70,
        traveller_verification_score=50,
        freshness_score=60,
        sentiment_score=50,
        food_score=40,
        safety_score=80,
    )
    kwargs.update(overrides)
    score, _penalties = compose_final_score(**kwargs)
    return score


class TestReviewConfidenceScaling:
    def test_ten_reviews_low_confidence(self):
        assert review_confidence_score(10) < 30

    def test_hundred_reviews_medium_confidence(self):
        conf = review_confidence_score(100)
        assert 40 <= conf <= 60

    def test_thousand_reviews_strong_confidence(self):
        conf = review_confidence_score(1000)
        assert 70 <= conf <= 85

    def test_ten_thousand_reviews_very_strong_confidence(self):
        conf = review_confidence_score(10000)
        assert conf >= 95

    def test_null_review_count_returns_none(self):
        assert review_confidence_score(None) is None


class TestPopularityScoreComparison:
    def test_few_reviews_high_rating_lower_than_many_reviews_good_rating(self):
        place_a_pop = popularity_score(rating=98, review_count=12)
        place_b_pop = popularity_score(rating=88, review_count=6500)
        assert place_b_pop > place_a_pop

    def test_many_reviews_high_rating_is_highest(self):
        moderate = popularity_score(rating=80, review_count=100)
        strong = popularity_score(rating=90, review_count=10000)
        assert strong > moderate

    def test_rating_only_without_reviews(self):
        pop = popularity_score(rating=80, review_count=None)
        assert pop == 80.0

    def test_reviews_only_without_rating(self):
        pop = popularity_score(rating=None, review_count=1000)
        assert pop > 70


class TestNullSafeScoring:
    def test_missing_rating_does_not_crash(self):
        try:
            result = popularity_score(rating=None, review_count=500)
            assert result > 0
        except Exception:
            pytest.fail("popularity_score raised an exception with None rating")

    def test_missing_review_count_does_not_crash(self):
        try:
            result = popularity_score(rating=90, review_count=None)
            assert result > 0
        except Exception:
            pytest.fail("popularity_score raised an exception with None review_count")

    def test_all_none_returns_zero(self):
        assert popularity_score(rating=None, review_count=None) == 0

    def test_review_confidence_with_none_is_none(self):
        assert review_confidence_score(None) is None


class TestFreshnessScoring:
    def test_recently_verified_is_fully_fresh(self):
        assert freshness_score_from_days(10) == 100

    def test_freshness_decays_with_age(self):
        assert freshness_score_from_days(60) == 60
        assert freshness_score_from_days(120) == 30
        assert freshness_score_from_days(400) == 10

    def test_never_verified_scores_zero(self):
        assert freshness_score_from_days(None) == 0


class TestPenaltyApplication:
    def test_high_report_count_penalty(self):
        base = _score(report_count=10, rating_score=80)
        no_penalty = _score(report_count=0, rating_score=80)
        assert base < no_penalty

    def test_high_report_count_penalty_is_explained(self):
        _, penalties = compose_final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, sentiment_score=50, food_score=40, safety_score=80,
            report_count=10,
        )
        assert any("report count" in p.lower() for p in penalties)

    def test_low_safety_score_penalty(self):
        base = _score(safety_score=20)
        no_penalty = _score(safety_score=50)
        assert base < no_penalty

    def test_low_rating_penalty(self):
        base = _score(rating_score=30)
        no_penalty = _score(rating_score=70)
        assert base < no_penalty

    def test_stale_data_penalty(self):
        base = _score(last_verified_days=400)
        no_penalty = _score(last_verified_days=100)
        assert base < no_penalty

    def test_no_penalties_for_clean_place(self):
        _, penalties = compose_final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, sentiment_score=50, food_score=40, safety_score=80,
        )
        assert penalties == []

    def test_final_score_clamped_between_zero_and_hundred(self):
        score = _score(
            popularity=100, trust_score=100, traveller_verification_score=100,
            freshness_score=100, sentiment_score=100, food_score=100, safety_score=100,
        )
        assert 0 <= score <= 100

    def test_final_score_never_below_zero(self):
        score = _score(
            popularity=0, trust_score=0, traveller_verification_score=0,
            freshness_score=0, sentiment_score=0, food_score=0, safety_score=0,
            report_count=100,
        )
        assert score == 0
