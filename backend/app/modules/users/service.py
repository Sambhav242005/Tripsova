from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.shared.errors import NotFoundError


async def get_user(db: AsyncSession, user_id: str) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "display_name": getattr(user, "display_name", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "bio": getattr(user, "bio", None),
        "role": user.role,
        "verification_status": getattr(user, "verification_status", None),
        "created_at": user.created_at.isoformat() if hasattr(user, "created_at") and user.created_at else None,
    }


async def update_user(db: AsyncSession, user_id: str, data: dict) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
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
