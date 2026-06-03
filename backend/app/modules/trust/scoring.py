from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trust.models import TrustEvent
from app.shared.utils import clamp


async def calculate_trust_score(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
) -> float:
    """
    Calculate trust score for an entity.
    Starts at 50 (neutral), adds positive event deltas, subtracts negative event deltas.
    Clamped to 0-100 range.
    """
    positive_result = await db.execute(
        select(func.coalesce(func.sum(TrustEvent.score_delta), 0))
        .where(
            TrustEvent.entity_type == entity_type,
            TrustEvent.entity_id == entity_id,
            TrustEvent.score_delta > 0,
        )
    )
    positive_sum = positive_result.scalar() or 0

    negative_result = await db.execute(
        select(func.coalesce(func.sum(TrustEvent.score_delta), 0))
        .where(
            TrustEvent.entity_type == entity_type,
            TrustEvent.entity_id == entity_id,
            TrustEvent.score_delta < 0,
        )
    )
    negative_sum = negative_result.scalar() or 0

    score = 50 + positive_sum + negative_sum
    return clamp(score, 0, 100)
