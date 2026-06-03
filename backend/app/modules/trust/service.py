from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trust.models import TrustEvent
from app.modules.trust.scoring import calculate_trust_score
from app.shared.errors import NotFoundError
from app.shared.utils import utcnow


async def get_trust_score(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
) -> dict:
    score = await calculate_trust_score(db, entity_type, entity_id)

    result = await db.execute(
        select(TrustEvent)
        .where(
            TrustEvent.entity_type == entity_type,
            TrustEvent.entity_id == entity_id,
        )
        .order_by(TrustEvent.created_at.desc())
        .limit(20)
    )
    events = result.scalars().all()

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "score": round(score, 2),
        "recent_events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "score_delta": e.score_delta,
                "reason": e.reason,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
        "total_events": len(events),
    }


async def add_trust_event(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
    event_type: str,
    score_delta: float,
    reason: str,
) -> TrustEvent:
    event = TrustEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        score_delta=score_delta,
        reason=reason,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event
