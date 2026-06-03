import httpx
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.shared.utils import utcnow
from app.shared.enums import SentimentLabel
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

    async def search_reviews(
        self,
        place_name: str,
        destination_name: str = None,
        limit: int = 10,
    ) -> dict:
        query = f"{place_name}"
        if destination_name:
            query = f"{place_name} {destination_name}"
        limit = min(limit, 25)

        results = await self._search_via_pushshift(query, limit)
        if not results:
            results = await self._search_via_reddit_json(query, limit)

        return self._categorize_results(results, place_name)

    async def _search_via_pushshift(self, query: str, limit: int) -> list[dict]:
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
                    title = item.get("title", "")
                    selftext = item.get("selftext", "")
                    insight, sent_label, sent_score = self._analyze(title, selftext)
                    if not insight:
                        continue
                    results.append(self._build_result(item, title, insight, sent_label, sent_score))
            except Exception:
                pass
        return results

    async def _search_via_reddit_json(self, query: str, limit: int) -> list[dict]:
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
                    title = item.get("title", "")
                    selftext = item.get("selftext", "")
                    insight, sent_label, sent_score = self._analyze(title, selftext)
                    if not insight:
                        continue
                    results.append(self._build_result(item, title, insight, sent_label, sent_score))
            except Exception:
                pass
        return results

    def _build_result(self, item: dict, title: str, insight: str, sent, sent_score: float) -> dict:
        return {
            "source_url": f"https://reddit.com{item.get('permalink', '')}",
            "title": title[:200],
            "insight": insight,
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

        for r in results:
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

        return {
            "sources": sources,
            "positive": positive[:5],
            "negative": negative[:5],
            "complaints": complaints[:3],
            "safety": safety_warnings[:3],
            "food": food_warnings[:3],
            "crowd": crowd_warnings[:3],
        }


reddit_review_provider = RedditDeepReviewProvider()
