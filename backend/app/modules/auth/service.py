from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.security import hash_password, verify_password, create_access_token
from app.shared.errors import NotFoundError, BadRequestError


async def register_user(db: AsyncSession, request) -> dict:
    result = await db.execute(select(User).where(User.email == request.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise BadRequestError("Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        role=request.role if hasattr(request, "role") else "USER",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(str(user.id), user.role)
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    }


async def login_user(db: AsyncSession, request) -> dict:
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(request.password, user.password_hash):
        raise BadRequestError("Invalid email or password")

    token = create_access_token(str(user.id), user.role)
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    }


async def get_current_user(db: AsyncSession, user_id: str) -> User:
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user
