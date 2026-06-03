from pydantic import BaseModel
from typing import Optional, Any


class TrustEventResponse(BaseModel):
    id: str
    event_type: str
    score_delta: float
    reason: str
    created_at: Optional[str] = None


class TrustScoreResponse(BaseModel):
    entity_type: str
    entity_id: str
    score: float
    recent_events: list[TrustEventResponse] = []
    total_events: int = 0
