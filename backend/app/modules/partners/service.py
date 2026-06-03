from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.partners.models import Partner
from app.shared.errors import NotFoundError, ForbiddenError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query


async def apply_partner(db: AsyncSession, user_id: str, data: dict) -> Partner:
    partner = Partner(
        user_id=user_id,
        name=data.get("name") or data.get("business_name"),
        type=data.get("type") or data.get("partner_type"),
        phone=data.get("phone") or data.get("contact_phone"),
        email=data.get("email") or data.get("contact_email"),
        location=data.get("location") or data.get("address"),
    )
    db.add(partner)
    await db.flush()
    await db.refresh(partner)
    return partner


async def get_partners(
    db: AsyncSession,
    status: str = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResult:
    stmt = select(Partner)
    if status:
        stmt = stmt.where(Partner.verification_status == status)
    stmt = stmt.order_by(Partner.created_at.desc())
    params = PaginatedParams(page=page, per_page=per_page)
    return await paginate_query(db, stmt, params)


async def approve_partner(db: AsyncSession, partner_id: str) -> Partner:
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner not found")
    partner.verification_status = "VERIFIED"
    await db.flush()
    await db.refresh(partner)
    return partner
