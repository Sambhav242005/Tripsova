from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.users.schemas import UserUpdate, UserResponse
from app.modules.users.service import get_user, update_user

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_my_profile(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    return await get_user(db, user_id)

@router.put("/me", response_model=UserResponse)
async def update_my_profile(body: UserUpdate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    return await update_user(db, user_id, body.model_dump(exclude_none=True))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    from app.modules.users.service import get_user_by_id
    return await get_user_by_id(db, user_id)
