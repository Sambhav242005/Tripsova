# Routes for deep review are here since data_sources handles deep review logic
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.data_sources.schemas import DeepReviewRequest, DeepReviewResponse
from app.modules.data_sources.ingestion_service import deep_review

router = APIRouter(prefix="/api/reviews", tags=["Deep Review"])

@router.post("/deep-check", response_model=DeepReviewResponse)
async def deep_review_endpoint(
    body: DeepReviewRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await deep_review(db, body.model_dump(exclude_none=True))
    return DeepReviewResponse(**result)
