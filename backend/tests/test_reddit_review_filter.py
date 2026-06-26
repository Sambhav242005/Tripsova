"""Unit tests for the Reddit deep-review NSFW / off-topic filtering.

These guard the reported bug: an NSFW spam post (an r/DeluxToys "…penis size…"
thread) leaking into a food spot's review panel next to a legitimate r/Indore
thread. The provider must drop adult/spam and off-topic posts before they surface.
"""

import pytest

from app.modules.data_sources.reddit_deep_review_provider import RedditDeepReviewProvider


@pytest.fixture
def provider():
    return RedditDeepReviewProvider()


class TestRelevanceTokens:
    def test_extracts_significant_words_from_place_and_destination(self, provider):
        tokens = provider._relevance_tokens("Sarafa Bazaar", "Indore")
        assert {"sarafa", "bazaar", "indore"} <= tokens

    def test_drops_short_words_and_generic_filler(self, provider):
        tokens = provider._relevance_tokens("The Best Cafe", None)
        assert "the" not in tokens          # stopword
        assert "best" not in tokens         # generic filler
        assert "cafe" not in tokens         # generic venue type
        assert all(len(tok) >= 3 for tok in tokens)


class TestPassesFilters:
    def _tokens(self, provider):
        return provider._relevance_tokens("Sarafa Bazaar", "Indore")

    def test_rejects_over_18_flagged_post(self, provider):
        item = {"over_18": True, "subreddit": "Indore", "title": "Sarafa night food", "selftext": ""}
        assert provider._passes_filters(item, self._tokens(provider)) is False

    def test_rejects_nsfw_spam_even_when_it_name_drops_the_city(self, provider):
        # The exact reported leak: adult content from an off-topic commercial sub that
        # happens to mention the city. The adult term must block it regardless.
        item = {"subreddit": "DeluxToys", "title": "Indore penis size guide", "selftext": "buy now"}
        assert provider._passes_filters(item, self._tokens(provider)) is False

    def test_rejects_off_topic_post(self, provider):
        item = {"subreddit": "AskReddit", "title": "Best laptop under 50k?", "selftext": "need help"}
        assert provider._passes_filters(item, self._tokens(provider)) is False

    def test_accepts_relevant_clean_post(self, provider):
        item = {"subreddit": "Indore", "title": "Sarafa Bazaar food crawl", "selftext": "amazing chaat"}
        assert provider._passes_filters(item, self._tokens(provider)) is True

    def test_rejects_destination_only_match_when_place_tokens_exist(self, provider):
        place_tokens = provider._relevance_tokens("Pin & Pan Cafe")
        destination_tokens = provider._relevance_tokens("Bhopal")
        item = {"subreddit": "Bhopal", "title": "Bhopal cafe guide", "selftext": "great places"}
        assert provider._passes_filters(item, place_tokens, destination_tokens) is False

    def test_accepts_exact_named_cafe_match(self, provider):
        place_tokens = provider._relevance_tokens("Pin & Pan Cafe")
        destination_tokens = provider._relevance_tokens("Bhopal")
        item = {"subreddit": "Bhopal", "title": "Pin and Pan cafe review", "selftext": "great Jain options"}
        assert provider._passes_filters(item, place_tokens, destination_tokens) is True

    def test_place_name_containing_sex_substring_is_not_a_false_positive(self, provider):
        # Word-boundary matching: "Sussex"/"Essex" contain "sex" but are legitimate.
        tokens = provider._relevance_tokens("Sussex Inn", "Sussex")
        item = {"subreddit": "Sussex", "title": "Sussex Inn breakfast", "selftext": "lovely stay"}
        assert provider._passes_filters(item, tokens) is True

    def test_relevance_gate_is_skipped_when_no_place_tokens(self, provider):
        # With no derivable place tokens, fall back to NSFW-only filtering (don't drop all).
        clean = {"subreddit": "travel", "title": "random musings", "selftext": ""}
        nsfw = {"subreddit": "travel", "title": "nsfw content here", "selftext": ""}
        assert provider._passes_filters(clean, set()) is True
        assert provider._passes_filters(nsfw, set()) is False


class TestCategorizeResults:
    def test_deduplicates_reddit_cards(self, provider):
        result = provider._categorize_results(
            [
                {
                    "source_url": "https://reddit.com/r/bhopal/1",
                    "title": "Pin and Pan cafe review",
                    "insight": "Reviewers mention 'great' positively",
                    "snippet": "great place",
                    "subreddit": "bhopal",
                    "sentiment": "POSITIVE",
                    "sentiment_score": 80,
                },
                {
                    "source_url": "https://reddit.com/r/bhopal/1",
                    "title": "Pin and Pan cafe review",
                    "insight": "Reviewers mention 'great' positively",
                    "snippet": "great place",
                    "subreddit": "bhopal",
                    "sentiment": "POSITIVE",
                    "sentiment_score": 80,
                },
            ],
            "Pin & Pan Cafe",
        )

        assert len(result["top_reviews"]) == 1
        assert len(result["sources"]) == 1
