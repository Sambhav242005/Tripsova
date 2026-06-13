from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.auth.models import User, RefreshToken
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.shared.errors import NotFoundError, BadRequestError, UnauthorizedError


async def _issue_refresh_token(db: AsyncSession, user: User) -> str:
    raw_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRY_DAYS),
        )
    )
    await db.flush()
    return raw_token


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
    refresh_token = await _issue_refresh_token(db, user)
    return {
        "token": token,
        "refresh_token": refresh_token,
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
        raise UnauthorizedError("Invalid email or password")

    token = create_access_token(str(user.id), user.role)
    refresh_token = await _issue_refresh_token(db, user)
    return {
        "token": token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    }


async def _get_valid_refresh_token(db: AsyncSession, raw_token: str) -> RefreshToken:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        raise UnauthorizedError("Invalid refresh token")
    if stored.revoked_at is not None:
        raise UnauthorizedError("Refresh token has been revoked")
    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token has expired")
    return stored


async def refresh_access_token(db: AsyncSession, raw_token: str) -> dict:
    stored = await _get_valid_refresh_token(db, raw_token)

    result = await db.execute(select(User).where(User.id == stored.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError("Invalid refresh token")

    # Rotation: each refresh token is single-use.
    stored.revoked_at = datetime.now(timezone.utc)
    new_refresh_token = await _issue_refresh_token(db, user)
    token = create_access_token(str(user.id), user.role)
    return {"token": token, "refresh_token": new_refresh_token}


async def logout_user(db: AsyncSession, raw_token: str) -> None:
    stored = await _get_valid_refresh_token(db, raw_token)
    stored.revoked_at = datetime.now(timezone.utc)
    await db.flush()


async def get_current_user(db: AsyncSession, user_id: str) -> User:
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user
