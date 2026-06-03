import pytest
from app.shared.sentiment import analyze_sentiment, sentiment_to_score, aggregate_sentiment


class TestAnalyzeSentiment:
    def test_positive_text(self):
        result = analyze_sentiment("This place is amazing and wonderful!")
        assert result["label"] == "POSITIVE"
        assert result["score"] > 60

    def test_negative_text(self):
        result = analyze_sentiment("Terrible experience, avoid at all costs.")
        assert result["label"] == "NEGATIVE"
        assert result["score"] < 40

    def test_neutral_text(self):
        result = analyze_sentiment("The bus leaves at 3pm from platform 2.")
        assert result["label"] == "NEUTRAL"

    def test_mixed_text(self):
        result = analyze_sentiment("The restaurant was okay, service was average.")
        assert 30 <= result["score"] <= 70

    def test_empty_text_returns_neutral(self):
        result = analyze_sentiment("")
        assert result["score"] == 50.0
        assert result["label"] in ("NEUTRAL", "POSITIVE")

    def test_whitespace_text_returns_neutral(self):
        result = analyze_sentiment("   ")
        assert result["score"] == 50.0


class TestSentimentToScore:
    def test_positive_score_above_50(self):
        assert sentiment_to_score("Absolutely loved it!") > 60

    def test_negative_score_below_50(self):
        assert sentiment_to_score("Worst trip ever.") < 40

    def test_empty_returns_50(self):
        assert sentiment_to_score("") == 50.0


class TestAggregateSentiment:
    def test_single_score(self):
        result = aggregate_sentiment([80.0])
        assert result["score"] == 80.0
        assert result["count"] == 1

    def test_multiple_scores_averaged(self):
        result = aggregate_sentiment([80.0, 20.0])
        assert result["score"] == 50.0
        assert result["count"] == 2

    def test_empty_list_returns_zero(self):
        result = aggregate_sentiment([])
        assert result["score"] == 0.0
        assert result["count"] == 0

    def test_magnitude_reflects_spread(self):
        tight = aggregate_sentiment([50, 52, 48])
        wide = aggregate_sentiment([90, 10, 50])
        assert wide["magnitude"] > tight["magnitude"]
