from math import ceil
from typing import Generic, TypeVar, Sequence

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PaginatedParams:
    def __init__(self, page: int = 1, per_page: int = 20):
        self.page = max(page, 1)
        self.per_page = min(max(per_page, 1), 100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


class PaginatedResult(BaseModel, Generic[T]):
    items: Sequence[T]
    total: int
    page: int
    per_page: int
    total_pages: int

    class Config:
        from_attributes = True


async def paginate_query(
    db: AsyncSession,
    stmt,
    params: PaginatedParams,
) -> PaginatedResult:
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = stmt.offset(params.offset).limit(params.limit)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return PaginatedResult(
        items=items,
        total=total,
        page=params.page,
        per_page=params.per_page,
        total_pages=ceil(total / params.per_page) if total > 0 else 1,
    )
