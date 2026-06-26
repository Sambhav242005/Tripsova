from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0)
    category: Optional[str] = Field(default=None, max_length=50)
    paid_by: str = Field(min_length=1, max_length=120)
    split: list[str] = Field(min_length=1)
    trip_id: Optional[str] = None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    description: str
    amount: float
    category: Optional[str] = None
    paid_by: str
    split: list[str]
    currency: str
    created_at: datetime


class Settlement(BaseModel):
    # Aliased to the natural JSON keys; "from" is a Python keyword so the field is from_.
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(serialization_alias="from", alias="from")
    to: str
    amount: float


class BudgetSummary(BaseModel):
    expenses: list[ExpenseResponse]
    members: list[str]
    total: float
    per_person: float
    # Net balance per participant: positive = others owe them, negative = they owe.
    balances: dict[str, float]
    settlements: list[Settlement]
    currency: str
