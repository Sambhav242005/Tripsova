from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id, require_admin
from app.modules.partners.schemas import PartnerApplyRequest, PartnerResponse
from app.modules.partners.service import apply_partner, get_partners, approve_partner
from app.shared.pagination import PaginatedResult

router = APIRouter(prefix="/api/partners", tags=["Partners"])

@router.post("/apply", status_code=201, response_model=PartnerResponse)
async def apply(
    body: PartnerApplyRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    p = await apply_partner(db, user_id, body.model_dump(exclude_none=True))
    return PartnerResponse.model_validate(p)

@router.get("", response_model=dict, dependencies=[Depends(require_admin)])
async def list_partners(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await get_partners(db, status=status, page=page, per_page=per_page)
    return {
        "items": [PartnerResponse.model_validate(p) for p in result.items],
        "total": result.total,
        "page": result.page,
        "per_page": result.per_page,
        "total_pages": result.total_pages,
    }

@router.post("/{partner_id}/approve", response_model=PartnerResponse, dependencies=[Depends(require_admin)])
async def approve(partner_id: str, db: AsyncSession = Depends(get_db)):
    p = await approve_partner(db, partner_id)
    return PartnerResponse.model_validate(p)
