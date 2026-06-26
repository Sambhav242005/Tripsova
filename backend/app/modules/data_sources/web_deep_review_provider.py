import html as _html
import re
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import parse_qs, unquote, urlparse

import httpx

from app.modules.data_sources.reddit_deep_review_provider import RedditDeepReviewProvider
from app.shared.sentiment import analyze_sentiment
from app.shared.utils import utcnow


class WebDeepReviewProvider:
    """Keyless general-web review search via DuckDuckGo's HTML endpoint.

    Broadens deep-review beyond Reddit: pulls organic result titles + snippets
    for "<place> <destination> review", then applies the *same* NSFW / spam and
    topical-relevance gating as the Reddit provider and returns the identical
    categorized shape, so the two sources merge cleanly in `deep_review`.

    No API key and no tracking cookie — DuckDuckGo's `html.duckduckgo.com`
    endpoint serves a plain results page we parse with regex (no bs4 dep).
    """

    DDG_HTML_URL = "https://html.duckduckgo.com/html/"

    # Reuse the Reddit provider's adult/spam blocklist and generic-filler stopwords
    # verbatim so both sources are gated identically (DRY — single source of truth).
    NSFW_RE = RedditDeepReviewProvider.NSFW_RE
    STOPWORDS = RedditDeepReviewProvider.STOPWORDS

    async def search_reviews(
        self,
        place_name: str,
        destination_name: str = None,
        limit: int = 12,
    ) -> dict:
        query = place_name
        if destination_name:
            query = f"{place_name} {destination_name}"
        query = f"{query} review"
        limit = max(1, min(limit, 25))

        place_tokens = self._relevance_tokens(place_name)
        destination_tokens = self._relevance_tokens(destination_name)
        results = await self._search_ddg(query, limit, place_tokens, destination_tokens)
        return self._categorize_results(results)

    async def _search_ddg(
        self,
        query: str,
        limit: int,
        place_tokens: set[str],
        destination_tokens: set[str],
    ) -> list[dict]:
        results: list[dict] = []
        async with httpx.AsyncClient(follow_redirects=True) as client:
            try:
                response = await client.post(
                    self.DDG_HTML_URL,
                    data={"q": query},
                    headers={"User-Agent": "Mozilla/5.0 (compatible; Tripova/1.0)"},
                    timeout=15,
                )
                response.raise_for_status()
                page = response.text
            except Exception:
                return results

        # Each organic result is a block carrying a result__a link and an
        # optional result__snippet. Split on the body marker and parse each block.
        for block in re.split(r'class="result__body"', page)[1:]:
            link = re.search(
                r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.DOTALL
            )
            if not link:
                continue
            url = self._resolve_url(link.group(1))
            title = self._clean(link.group(2))
            if not title or not url:
                continue
            snippet_m = re.search(
                r'class="result__snippet"[^>]*>(.*?)</a>', block, re.DOTALL
            )
            snippet = self._clean(snippet_m.group(1)) if snippet_m else ""

            haystack = f"{title} {snippet} {url}".lower()
            if self.NSFW_RE.search(haystack):
                continue
            haystack_tokens = set(re.findall(r"[a-z0-9]+", haystack))
            # Same relevance gate as Reddit (single weak token isn't enough — also
            # needs the city, or two place tokens) so off-topic pages are dropped.
            if not RedditDeepReviewProvider.is_relevant(haystack_tokens, place_tokens, destination_tokens):
                continue

            insight, sent_label, sent_score = self._analyze(title, snippet)
            results.append(
                {
                    "source_url": url,
                    "domain": urlparse(url).netloc.replace("www.", "") or "web",
                    "title": title[:200],
                    "snippet": snippet[:280],
                    "insight": insight or "Web discussion found",
                    "sentiment": sent_label,
                    "sentiment_score": sent_score,
                    "fetched_at": utcnow().isoformat(),
                    "expiry": (utcnow() + timedelta(days=90)).isoformat(),
                }
            )
            if len(results) >= limit:
                break
        return results

    def _resolve_url(self, href: str) -> str:
        """DuckDuckGo wraps result links as //duckduckgo.com/l/?uddg=<encoded>;
        unwrap to the real destination URL."""
        if href.startswith("//"):
            href = "https:" + href
        parsed = urlparse(href)
        if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
            params = parse_qs(parsed.query)
            if params.get("uddg"):
                return unquote(params["uddg"][0])
        return href

    def _clean(self, raw: str) -> str:
        return _html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()

    def _relevance_tokens(self, *names: Optional[str]) -> set[str]:
        tokens: set[str] = set()
        for name in names:
            for word in re.findall(r"[a-z0-9]+", (name or "").lower()):
                if len(word) >= 3 and word not in self.STOPWORDS:
                    tokens.add(word)
        return tokens

    def _analyze(self, title: str, snippet: str) -> tuple[Optional[str], str, float]:
        text = f"{title} {snippet}".lower()
        positive_kw = ["amazing", "best", "recommend", "love", "great", "delicious", "must", "excellent", "fantastic"]
        negative_kw = ["avoid", "overrated", "disappointing", "worst", "terrible", "bad", "dirty", "overpriced", "rude"]
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
        sent = analyze_sentiment(f"{title} {snippet}")
        return insight, sent["label"], sent["score"]

    def _categorize_results(self, results: list[dict]) -> dict:
        sources, positive, negative, complaints = [], [], [], []
        safety_warnings, food_warnings, crowd_warnings = [], [], []

        seen = set()
        deduped = []
        for r in results:
            key = (r.get("source_url") or "", re.sub(r"\s+", " ", (r.get("title") or "").strip().lower()))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(r)

        for r in deduped:
            sources.append(
                {
                    "name": r["domain"],
                    "url": r["source_url"],
                    "title": r["title"],
                    "sentiment": r["sentiment"],
                    "sentiment_score": r.get("sentiment_score", 50.0),
                }
            )
            if r["sentiment"] == "POSITIVE":
                positive.append(r["insight"])
            elif r["sentiment"] == "NEGATIVE":
                negative.append(r["insight"])
                complaints.append(r["insight"])

            text = (r.get("title", "") + " " + r.get("snippet", "")).lower()
            if any(kw in text for kw in ["unsafe", "dangerous", "scam", "theft", "food poisoning"]):
                safety_warnings.append(r["insight"])
            if any(kw in text for kw in ["jain", "veg", "vegan", "halal", "hygiene"]):
                food_warnings.append(r["insight"])
            if any(kw in text for kw in ["crowd", "crowded", "busy", "queue", "wait"]):
                crowd_warnings.append(r["insight"])

        top_reviews = [
            {
                "title": r.get("title", ""),
                "snippet": r.get("snippet", ""),
                "insight": r.get("insight", ""),
                "url": r.get("source_url", ""),
                "source": r.get("domain"),
                "subreddit": None,
                "sentiment": r.get("sentiment", "UNKNOWN"),
                "createdDate": None,
            }
            for r in deduped
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


web_review_provider = WebDeepReviewProvider()
