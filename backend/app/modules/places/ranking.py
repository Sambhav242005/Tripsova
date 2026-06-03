from math import log10
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.places.models import Place, FoodVerification
from app.modules.feed.models import FeedPost
from app.modules.trust.models import TrustEvent
from app.modules.users.models import DeepReviewQuery
from app.shared.sentiment import sentiment_to_score, aggregate_sentiment
from app.shared.utils import clamp


async def calculate_tripova_score(db: AsyncSession, place: Place) -> dict:
    rating = place.external_rating
    review_count = place.external_review_count
    last_verified_at = place.last_verified_at
    place_id = str(place.id)
    penalties = []

    external_rating_score = rating if rating is not None else None

    review_confidence = None
    if review_count is not None:
        review_confidence = min(100, log10(review_count + 1) / log10(10000) * 100)

    if external_rating_score is not None and review_confidence is not None:
        popularity_score = external_rating_score * 0.60 + review_confidence * 0.40
    elif external_rating_score is not None:
        popularity_score = external_rating_score
    elif review_confidence is not None:
        popularity_score = review_confidence
    else:
        popularity_score = 0

    trust_result = await db.execute(
        select(func.coalesce(func.sum(TrustEvent.score_delta), 0))
        .where(
            TrustEvent.entity_type == "place",
            TrustEvent.entity_id == place_id,
        )
    )
    trust_delta = trust_result.scalar() or 0
    trust_score = clamp(50 + trust_delta, 0, 100)

    feed_count_result = await db.execute(
        select(func.count(FeedPost.id)).where(FeedPost.place_id == place.id)
    )
    feed_count = feed_count_result.scalar() or 0

    helpful_sum_result = await db.execute(
        select(func.coalesce(func.sum(FeedPost.helpful_count), 0))
        .where(FeedPost.place_id == place.id)
    )
    helpful_sum = helpful_sum_result.scalar() or 0

    verification_count_result = await db.execute(
        select(func.count(FoodVerification.id)).where(FoodVerification.place_id == place.id)
    )
    verification_count = verification_count_result.scalar() or 0

    traveller_verification_score = min(
        100,
        (feed_count * 10) + (helpful_sum * 2) + (verification_count * 15),
    )

    now = datetime.now(timezone.utc)
    freshness_score = 0
    if last_verified_at is not None:
        days_since = (now - last_verified_at).days
        if days_since <= 30:
            freshness_score = 100
        elif days_since <= 90:
            freshness_score = 60
        elif days_since <= 180:
            freshness_score = 30
        else:
            freshness_score = 10
    else:
        freshness_score = 0

    food_score = min(100, verification_count * 20)

    report_count = 0
    report_result = await db.execute(
        select(func.coalesce(func.sum(FeedPost.report_count), 0))
        .where(FeedPost.place_id == place.id)
    )
    report_count = report_result.scalar() or 0

    safety_score = clamp(100 - (report_count * 5), 0, 100)

    feed_posts_result = await db.execute(
        select(FeedPost.content).where(FeedPost.place_id == place.id)
    )
    feed_texts = feed_posts_result.scalars().all() or []
    feed_scores = []
    if feed_texts:
        feed_scores = [sentiment_to_score(t or "") for t in feed_texts]

    deep_review_scores_result = await db.execute(
        select(DeepReviewQuery.sentiment_score).where(DeepReviewQuery.place_id == place.id)
    )
    dr_scores = deep_review_scores_result.scalars().all() or []

    all_sentiment_scores = feed_scores + [s for s in dr_scores if s is not None]
    if all_sentiment_scores:
        agg = aggregate_sentiment(all_sentiment_scores)
        sentiment_score = agg["score"]
    else:
        sentiment_score = 50

    finalScore = (
        (popularity_score or 0) * 0.25
        + trust_score * 0.25
        + traveller_verification_score * 0.20
        + freshness_score * 0.10
        + sentiment_score * 0.10
        + food_score * 0.05
        + safety_score * 0.05
    )

    if report_count > 5:
        penalty = 15
        finalScore -= penalty
        penalties.append(f"High report count ({report_count}) — penalized {penalty} points")

    if safety_score < 30:
        penalty = 10
        finalScore -= penalty
        penalties.append("Recent safety warning — penalized 10 points")

    if external_rating_score is not None and external_rating_score < 40:
        penalty = 5
        finalScore -= penalty
        penalties.append("Very low source confidence — penalized 5 points")

    if last_verified_at is not None:
        days_since = (now - last_verified_at).days
        if days_since > 365:
            penalty = 10
            finalScore -= penalty
            penalties.append("Stale data (>365 days since verification) — penalized 10 points")

    finalScore = clamp(finalScore, 0, 100)

    explanation_parts = []
    if popularity_score and popularity_score > 60:
        if rating is not None and review_count is not None:
            explanation_parts.append(
                f"This place has strong popularity because it has {rating} rating "
                f"from {review_count} reviews"
            )
        elif rating is not None:
            explanation_parts.append(f"This place has a {rating} rating")
    elif popularity_score and popularity_score < 30:
        explanation_parts.append("Popularity is low due to limited rating data")

    if traveller_verification_score < 30:
        explanation_parts.append(
            f"but Tripova traveller verification is still low because only "
            f"{verification_count} recent users verified it"
        )
    elif traveller_verification_score > 70:
        explanation_parts.append(
            f"and traveller verification is strong with {verification_count} verifications"
        )

    if sentiment_score is not None:
        if sentiment_score > 70:
            explanation_parts.append(f"Traveller sentiment is strongly positive ({sentiment_score:.0f}/100)")
        elif sentiment_score < 40:
            explanation_parts.append(f"Traveller sentiment is cautious ({sentiment_score:.0f}/100)")

    if report_count > 0:
        explanation_parts.append(
            f"however there are {report_count} report(s) which affect safety scoring"
        )

    explanation = ". ".join(explanation_parts) + "." if explanation_parts else "Score calculated from available data."

    return {
        "finalScore": round(finalScore, 2),
        "ratingScore": round(external_rating_score, 2) if external_rating_score is not None else None,
        "reviewConfidence": round(review_confidence, 2) if review_confidence is not None else None,
        "popularityScore": round(popularity_score, 2),
        "trustScore": round(trust_score, 2),
        "travellerVerificationScore": round(traveller_verification_score, 2),
        "freshnessScore": round(freshness_score, 2),
        "sentimentScore": round(sentiment_score, 2),
        "foodScore": round(food_score, 2),
        "safetyScore": round(safety_score, 2),
        "penalties": penalties,
        "explanation": explanation,
    }
