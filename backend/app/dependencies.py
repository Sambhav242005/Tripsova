import uuid as _uuid
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.security import decode_access_token
from app.shared.errors import UnauthorizedError, ForbiddenError
from app.config import settings


async def get_current_user_id(
    authorization: str = Header(None),
) -> str:
    if not authorization:
        raise UnauthorizedError("Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError("Invalid authorization scheme")
    payload = decode_access_token(token)
    if payload is None:
        raise UnauthorizedError("Invalid or expired token")
    return payload.get("sub")


async def get_current_user_role(
    authorization: str = Header(None),
) -> str:
    if not authorization:
        raise UnauthorizedError("Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError("Invalid authorization scheme")
    payload = decode_access_token(token)
    if payload is None:
        raise UnauthorizedError("Invalid or expired token")
    return payload.get("role", "USER")


async def require_admin(
    role: str = Depends(get_current_user_role),
) -> str:
    if role != "ADMIN":
        raise ForbiddenError("Admin access required")
    return role


async def require_auth(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> str:
    return user_id
