from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.budget.schemas import BudgetSummary, ExpenseCreate
from app.modules.budget.service import add_expense, delete_expense, get_budget

router = APIRouter(prefix="/api/budget", tags=["Budget"])


@router.get("", response_model=BudgetSummary)
async def read_budget(
    trip_id: str = Query(None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """The current user's expense ledger with computed totals and settle-up."""
    return await get_budget(db, user_id, trip_id)


@router.post("/expenses", response_model=BudgetSummary, status_code=201)
async def create_expense(
    body: ExpenseCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Record a real expense; returns the recomputed budget summary."""
    return await add_expense(db, user_id, body.model_dump())


@router.delete("/expenses/{expense_id}", response_model=BudgetSummary)
async def remove_expense(
    expense_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete one of the current user's expenses; returns the recomputed summary."""
    return await delete_expense(db, user_id, expense_id)
