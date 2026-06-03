from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.auth.schemas import RegisterRequest, LoginRequest, TokenResponse, AuthUserResponse
from app.modules.auth.service import register_user, login_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await register_user(db, body)
    return TokenResponse(access_token=result["token"], token_type="bearer")

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await login_user(db, body)
    return TokenResponse(access_token=result["token"], token_type="bearer")

@router.get("/me", response_model=AuthUserResponse)
async def get_me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    from app.modules.auth.service import get_current_user
    user = await get_current_user(db, user_id)
    return AuthUserResponse.model_validate(user)
