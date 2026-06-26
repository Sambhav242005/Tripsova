import re
import httpx
from datetime import datetime, timedelta
from typing import Optional

from app.shared.utils import utcnow
from app.shared.sentiment import analyze_sentiment


class RedditDeepReviewProvider:
    """
    Searches Reddit for place reviews using public APIs.
    Returns short derived insights without storing full comment content.

    Only stores:
    - source_url
    - title
    - short derived insight
    - sentiment label
    - created_date
    - fetched_at
    - expiry
    """

    REDDIT_JSON_BASE = "https://www.reddit.com"
    PUSHSHIFT_URL = "https://api.pullpush.io/reddit/search/comment"
    PUSHSHIFT_SUBMISSION_URL = "https://api.pullpush.io/reddit/search/submission"

    # Adult / spam signals. Reddit search is loose and happily surfaces NSFW or
    # commercial junk (e.g. an r/DeluxToys "…penis size…" post) whose text merely
    # brushes the query. We drop anything flagged over_18 or carrying these terms in
    # its subreddit / title / body, so a place's review panel never shows off-topic
    # spam. Matched on word boundaries so place names like "Essex"/"Sussex" (which
    # contain "sex") are not false-positives.
    NSFW_RE = re.compile(
        r"\b(?:nsfw|porn|sex|penis|dick|cock|dildo|vibrator|escort|hookup|"
        r"onlyfans|xxx|boobs|nude|milf|fetish|sextoys?|sex\s+toys?|adult\s+toys?)\b"
    )
    # Generic filler that shouldn't count as a specific place reference. This is
    # intentionally strict for food venues; "cafe" or "restaurant" alone is not
    # enough to show a Reddit post on a named cafe card.
    STOPWORDS = {
        "the", "and", "for", "near", "best", "city", "town", "place", "review", "reviews",
        "cafe", "caf", "restaurant", "restaurants", "bakery", "lounge", "hotel", "kitchen",
        "food", "foods", "eat", "eats", "tea", "coffee", "shop", "bar",
    }

    async def search_reviews(
        self,
        place_name: str,
        destination_name: str = None,
        limit: int = 10,
    ) -> dict:
        query = f"{place_name}"
        if destination_name:
            query = f"{place_name} {destination_name}"
        # Prefer the top 100 hits by score; callers ask for 100 and Reddit/pullpush
        # naturally return fewer (down to ~50 or less) for niche places.
        limit = max(1, min(limit, 100))

        place_tokens = self._relevance_tokens(place_name)
        destination_tokens = self._relevance_tokens(destination_name)
        results = await self._search_via_pushshift(query, limit, place_tokens, destination_tokens)
        if not results:
            results = await self._search_via_reddit_json(query, limit, place_tokens, destination_tokens)

        return self._categorize_results(results, place_name)

    async def _search_via_pushshift(
        self,
        query: str,
        limit: int,
        place_tokens: set[str],
        destination_tokens: set[str] | None = None,
    ) -> list[dict]:
        params = {"q": query, "size": limit, "sort": "score"}
        results = []
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.PUSHSHIFT_SUBMISSION_URL, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                for item in data.get("data", []):
                    if not item.get("selftext") and not item.get("title"):
                        continue
                    if not self._passes_filters(item, place_tokens, destination_tokens):
                        continue
                    title = item.get("title", "")
                    selftext = item.get("selftext", "")
                    insight, sent_label, sent_score = self._analyze(title, selftext)
                    if not insight:
                        continue
                    results.append(self._build_result(item, title, insight, sent_label, sent_score))
            except Exception:
                pass
        return results

    async def _search_via_reddit_json(
        self,
        query: str,
        limit: int,
        place_tokens: set[str],
        destination_tokens: set[str] | None = None,
    ) -> list[dict]:
        url = f"{self.REDDIT_JSON_BASE}/search.json"
        params = {"q": query, "limit": limit, "sort": "relevance", "t": "year"}
        results = []
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, headers={"User-Agent": "Tripova/1.0"}, timeout=15)
                response.raise_for_status()
                data = response.json()
                for child in data.get("data", {}).get("children", []):
                    item = child.get("data", {})
                    if not self._passes_filters(item, place_tokens, destination_tokens):
                        continue
                    title = item.get("title", "")
                    selftext = item.get("selftext", "")
                    insight, sent_label, sent_score = self._analyze(title, selftext)
                    if not insight:
                        continue
                    results.append(self._build_result(item, title, insight, sent_label, sent_score))
            except Exception:
                pass
        return results

    def _relevance_tokens(self, *names: Optional[str]) -> set[str]:
        """Significant words from the place / destination, used to gate relevance:
        a kept post must actually mention the place or its city — not merely match a
        loose Reddit full-text search. Short words and generic travel filler are dropped."""
        tokens: set[str] = set()
        for name in names:
            for word in re.findall(r"[a-z0-9]+", (name or "").lower()):
                if len(word) >= 3 and word not in self.STOPWORDS:
                    tokens.add(word)
        return tokens

    def _passes_filters(
        self,
        item: dict,
        place_tokens: set[str],
        destination_tokens: set[str] | None = None,
    ) -> bool:
        """Reject NSFW / spam and off-topic posts before they reach the review panel.

        Three gates: Reddit's own over_18 flag, an adult/commercial term blocklist
        across subreddit+title+body, and a topical-relevance check that the post
        references the queried place. Destination-only matches are allowed only
        when no meaningful place tokens can be derived.
        """
        if item.get("over_18"):
            return False
        subreddit = (item.get("subreddit") or "").lower()
        title = (item.get("title") or "").lower()
        body = (item.get("selftext") or "").lower()
        haystack = f"{subreddit} {title} {body}"
        if self.NSFW_RE.search(haystack):
            return False
        haystack_tokens = set(re.findall(r"[a-z0-9]+", haystack))
        return self.is_relevant(haystack_tokens, place_tokens, destination_tokens)

    @staticmethod
    def is_relevant(
        haystack_tokens: set[str],
        place_tokens: set[str],
        destination_tokens: set[str] | None = None,
    ) -> bool:
        """Topical-relevance gate shared by the Reddit and web providers.

        Short, common place tokens ("pin", "pan" from "Pin & Pan Café") match
        plenty of unrelated posts, which is how horror/coffee-setup threads leaked
        into a café's review panel. So a single weak token is not enough: we also
        require the destination/city to be mentioned, OR at least two distinct
        place-name tokens to co-occur. Destination-only matches are allowed only
        when no meaningful place token can be derived.
        """
        matched_place = place_tokens & haystack_tokens
        if place_tokens:
            if not matched_place:
                return False
            if destination_tokens:
                matched_dest = destination_tokens & haystack_tokens
                if not matched_dest and len(matched_place) < 2:
                    return False
            elif len(matched_place) < 2:
                # No city to corroborate and only one weak token — too loose.
                return len(next(iter(matched_place))) >= 5
            return True
        if destination_tokens and not (destination_tokens & haystack_tokens):
            return False
        return True

    def _build_result(self, item: dict, title: str, insight: str, sent, sent_score: float) -> dict:
        snippet = (item.get("selftext") or "").strip().replace("\n", " ")
        return {
            "source_url": f"https://reddit.com{item.get('permalink', '')}",
            "title": title[:200],
            "insight": insight,
            "snippet": snippet[:280],
            "subreddit": item.get("subreddit"),
            "score": item.get("score", 0),
            "sentiment": sent.value if hasattr(sent, 'value') else str(sent),
            "sentiment_score": sent_score,
            "created_date": datetime.utcfromtimestamp(item.get("created_utc", 0)).isoformat() if item.get("created_utc") else None,
            "fetched_at": utcnow().isoformat(),
            "expiry": (utcnow() + timedelta(days=90)).isoformat(),
        }

    def _analyze(self, title: str, body: str) -> tuple[Optional[str], str, float]:
        text = f"{title} {body[:500]}".lower()
        positive_kw = ["amazing", "beautiful", "must visit", "recommend", "love", "great", "fantastic", "wonderful", "incredible", "best"]
        negative_kw = ["avoid", "overrated", "disappointing", "worst", "terrible", "bad", "scam", "dangerous", "dirty", "overpriced"]
        food_kw = ["jain", "veg", "vegan", "halal", "food", "restaurant", "eat"]
        safety_kw = ["safe", "unsafe", "dangerous", "solo", "female", "scam", "theft"]
        crowd_kw = ["crowd", "crowded", "busy", "weekend", "peak", "packed"]

        insight = None
        for kw in positive_kw:
            if kw in text:
                insight = f"Reviewers mention '{kw}' positively"
                break
        if not insight:
            for kw in negative_kw:
                if kw in text:
                    insight = f"Reviewers express concerns mentioning '{kw}'"
                    break

        if not insight:
            if any(kw in text for kw in food_kw):
                insight = "Food-related discussion found"
            elif any(kw in text for kw in safety_kw):
                insight = "Safety-related discussion found"
            elif any(kw in text for kw in crowd_kw):
                insight = "Crowd-related discussion found"

        sent_result = analyze_sentiment(f"{title} {body[:1000]}")
        return insight, sent_result["label"], sent_result["score"]

    def _categorize_results(self, results: list[dict], place_name: str) -> dict:
        sources = []
        positive = []
        negative = []
        complaints = []
        safety_warnings = []
        food_warnings = []
        crowd_warnings = []

        deduped_results = []
        seen = set()
        for r in results:
            title_key = re.sub(r"\s+", " ", (r.get("title") or "").strip().lower())
            key = (r.get("source_url") or "", title_key)
            if key in seen:
                continue
            seen.add(key)
            deduped_results.append(r)

        for r in deduped_results:
            sources.append({
                "name": "reddit",
                "url": r["source_url"],
                "title": r["title"],
                "sentiment": r["sentiment"],
                "sentiment_score": r.get("sentiment_score", 50.0),
            })
            if r["sentiment"] == "POSITIVE":
                positive.append(r["insight"])
            elif r["sentiment"] == "NEGATIVE":
                negative.append(r["insight"])
                complaints.append(r["insight"])

            text_for_categorization = (r.get("title", "") + " " + r.get("insight", "")).lower()
            if any(kw in text_for_categorization for kw in ["unsafe", "dangerous", "solo", "female", "scam", "theft"]):
                safety_warnings.append(r["insight"])
            if any(kw in text_for_categorization for kw in ["jain", "veg", "vegan", "halal", "food"]):
                food_warnings.append(r["insight"])
            if any(kw in text_for_categorization for kw in ["crowd", "crowded", "busy", "weekend"]):
                crowd_warnings.append(r["insight"])

        # Raw top reviews (already in score order from pullpush/Reddit), surfaced to
        # the UI so travellers see actual Reddit voices, not just derived signals.
        top_reviews = [
            {
                "title": r.get("title", ""),
                "snippet": r.get("snippet", ""),
                "insight": r.get("insight", ""),
                "url": r.get("source_url", ""),
                "source": "reddit",
                "subreddit": r.get("subreddit"),
                "sentiment": r.get("sentiment", "UNKNOWN"),
                "createdDate": r.get("created_date"),
            }
            for r in deduped_results
        ]

        return {
            "sources": sources,
            "positive": list(dict.fromkeys(positive))[:5],
            "negative": list(dict.fromkeys(negative))[:5],
            "complaints": list(dict.fromkeys(complaints))[:3],
            "safety": list(dict.fromkeys(safety_warnings))[:3],
            "food": list(dict.fromkeys(food_warnings))[:3],
            "crowd": list(dict.fromkeys(crowd_warnings))[:3],
            "top_reviews": top_reviews,
        }


reddit_review_provider = RedditDeepReviewProvider()
