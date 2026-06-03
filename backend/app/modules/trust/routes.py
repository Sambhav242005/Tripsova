from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.trust.schemas import TrustScoreResponse
from app.modules.trust.service import get_trust_score

router = APIRouter(prefix="/api/trust", tags=["Trust"])

@router.get("/{entity_type}/{entity_id}", response_model=TrustScoreResponse)
async def trust_score(entity_type: str, entity_id: str, db: AsyncSession = Depends(get_db)):
    result = await get_trust_score(db, entity_type, entity_id)
    return TrustScoreResponse(**result)
