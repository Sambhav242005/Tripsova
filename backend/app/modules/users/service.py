import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.shared.errors import NotFoundError


def _to_uuid(user_id: str) -> uuid.UUID:
    # User.id is a UUID column; comparing it to a plain str raises
    # "'str' object has no attribute 'hex'" on SQLite, so coerce first.
    try:
        return user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        raise NotFoundError("User not found")


async def get_user(db: AsyncSession, user_id: str) -> dict:
    result = await db.execute(select(User).where(User.id == _to_uuid(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "phone": getattr(user, "phone", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "role": user.role,
        "verification_status": getattr(user, "verification_status", None),
        "trust_score": getattr(user, "trust_score", 0.0) or 0.0,
        "travel_style": getattr(user, "travel_style", None) if isinstance(getattr(user, "travel_style", None), dict) else None,
        "diet_preference": (
            {str(k): True for k in user.diet_preference}
            if isinstance(getattr(user, "diet_preference", None), list)
            else getattr(user, "diet_preference", None)
        ),
        "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
        "updated_at": user.updated_at.isoformat() if getattr(user, "updated_at", None) else None,
    }


async def update_user(db: AsyncSession, user_id: str, data: dict) -> dict:
    result = await db.execute(select(User).where(User.id == _to_uuid(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")

    allowed_fields = {"name", "display_name", "avatar_url", "bio"}
    for key, value in data.items():
        if key in allowed_fields and hasattr(user, key):
            setattr(user, key, value)

    await db.flush()
    await db.refresh(user)
    return await get_user(db, user_id)


async def get_user_by_id(db: AsyncSession, user_id: str) -> dict:
    return await get_user(db, user_id)
