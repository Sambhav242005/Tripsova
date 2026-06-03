from math import log10

from app.shared.utils import clamp


def _review_confidence(review_count: int) -> float | None:
    if review_count is None:
        return None
    return min(100, log10(review_count + 1) / log10(10000) * 100)


def _popularity_score(rating: float | None, review_count: int | None) -> float:
    rating_score = rating if rating is not None else None
    confidence = _review_confidence(review_count)
    if rating_score is not None and confidence is not None:
        return rating_score * 0.60 + confidence * 0.40
    elif rating_score is not None:
        return rating_score
    elif confidence is not None:
        return confidence
    return 0


def _final_score(
    popularity: float,
    trust_score: float,
    traveller_verification_score: float,
    freshness_score: float,
    food_score: float,
    safety_score: float,
    report_count: int = 0,
    rating_score: float | None = None,
    last_verified_days: int | None = None,
) -> float:
    score = (
        popularity * 0.30
        + trust_score * 0.25
        + traveller_verification_score * 0.20
        + freshness_score * 0.10
        + food_score * 0.10
        + safety_score * 0.05
    )

    if report_count > 5:
        score -= 15

    if safety_score < 30:
        score -= 10

    if rating_score is not None and rating_score < 40:
        score -= 5

    if last_verified_days is not None and last_verified_days > 365:
        score -= 10

    return clamp(score, 0, 100)


class TestReviewConfidenceScaling:
    def test_ten_reviews_low_confidence(self):
        assert _review_confidence(10) < 30

    def test_hundred_reviews_medium_confidence(self):
        conf = _review_confidence(100)
        assert 40 <= conf <= 60

    def test_thousand_reviews_strong_confidence(self):
        conf = _review_confidence(1000)
        assert 70 <= conf <= 85

    def test_ten_thousand_reviews_very_strong_confidence(self):
        conf = _review_confidence(10000)
        assert conf >= 95

    def test_null_review_count_returns_none(self):
        assert _review_confidence(None) is None


class TestPopularityScoreComparison:
    def test_few_reviews_high_rating_lower_than_many_reviews_good_rating(self):
        place_a_pop = _popularity_score(rating=98, review_count=12)
        place_b_pop = _popularity_score(rating=88, review_count=6500)
        assert place_b_pop > place_a_pop

    def test_many_reviews_high_rating_is_highest(self):
        moderate = _popularity_score(rating=80, review_count=100)
        strong = _popularity_score(rating=90, review_count=10000)
        assert strong > moderate

    def test_rating_only_without_reviews(self):
        pop = _popularity_score(rating=80, review_count=None)
        assert pop == 80.0

    def test_reviews_only_without_rating(self):
        pop = _popularity_score(rating=None, review_count=1000)
        assert pop > 70


class TestNullSafeScoring:
    def test_missing_rating_does_not_crash(self):
        try:
            result = _popularity_score(rating=None, review_count=500)
            assert result > 0
        except Exception:
            pytest.fail("popularity_score raised an exception with None rating")

    def test_missing_review_count_does_not_crash(self):
        try:
            result = _popularity_score(rating=90, review_count=None)
            assert result > 0
        except Exception:
            pytest.fail("popularity_score raised an exception with None review_count")

    def test_all_none_returns_zero(self):
        assert _popularity_score(rating=None, review_count=None) == 0

    def test_review_confidence_with_none_is_none(self):
        assert _review_confidence(None) is None


class TestPenaltyApplication:
    def test_high_report_count_penalty(self):
        base = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=80, report_count=10,
            rating_score=80,
        )
        no_penalty = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=80, report_count=0,
            rating_score=80,
        )
        assert base < no_penalty

    def test_low_safety_score_penalty(self):
        base = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=20,
        )
        no_penalty = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=50,
        )
        assert base < no_penalty

    def test_low_rating_penalty(self):
        base = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=80,
            rating_score=30,
        )
        no_penalty = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=80,
            rating_score=70,
        )
        assert base < no_penalty

    def test_stale_data_penalty(self):
        base = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=80,
            last_verified_days=400,
        )
        no_penalty = _final_score(
            popularity=80, trust_score=70, traveller_verification_score=50,
            freshness_score=60, food_score=40, safety_score=80,
            last_verified_days=100,
        )
        assert base < no_penalty

    def test_final_score_clamped_between_zero_and_hundred(self):
        score = _final_score(
            popularity=100, trust_score=100, traveller_verification_score=100,
            freshness_score=100, food_score=100, safety_score=100,
        )
        assert 0 <= score <= 100

    def test_final_score_never_below_zero(self):
        score = _final_score(
            popularity=0, trust_score=0, traveller_verification_score=0,
            freshness_score=0, food_score=0, safety_score=0,
            report_count=100,
        )
        assert score == 0
