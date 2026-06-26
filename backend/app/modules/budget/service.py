import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.budget.models import Expense
from app.shared.errors import NotFoundError


def _uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise NotFoundError(f"Invalid {label} id")


def _expense_dict(e: Expense) -> dict:
    return {
        "id": str(e.id),
        "description": e.description,
        "amount": e.amount,
        "category": e.category,
        "paid_by": e.paid_by,
        "split": list(e.split or []),
        "currency": e.currency or "INR",
        "created_at": e.created_at,
    }


def _settle(balances: dict[str, float]) -> list[dict]:
    """Greedy minimal-transfer settle-up from net balances.

    Positive balance = the person is owed money; negative = they owe. We repeatedly
    match the biggest debtor to the biggest creditor until everyone nets to ~zero,
    which yields a small set of "X pays Y ₹n" transfers. All amounts come straight
    from recorded expenses — nothing here is invented.
    """
    creditors = sorted(((n, b) for n, b in balances.items() if b > 0.01), key=lambda x: -x[1])
    debtors = sorted(((n, -b) for n, b in balances.items() if b < -0.01), key=lambda x: -x[1])
    settlements: list[dict] = []
    ci = di = 0
    creditors = [list(c) for c in creditors]
    debtors = [list(d) for d in debtors]
    while ci < len(creditors) and di < len(debtors):
        cred_name, cred_amt = creditors[ci]
        debt_name, debt_amt = debtors[di]
        pay = min(cred_amt, debt_amt)
        settlements.append({"from": debt_name, "to": cred_name, "amount": round(pay, 2)})
        creditors[ci][1] -= pay
        debtors[di][1] -= pay
        if creditors[ci][1] <= 0.01:
            ci += 1
        if debtors[di][1] <= 0.01:
            di += 1
    return settlements


def _summarize(expenses: list[Expense]) -> dict:
    rows = [_expense_dict(e) for e in expenses]
    total = round(sum(r["amount"] for r in rows), 2)

    # Members = everyone who appears as a payer or in any split, in first-seen order.
    members: list[str] = []
    seen: set[str] = set()
    for r in rows:
        for name in [r["paid_by"], *r["split"]]:
            if name and name not in seen:
                seen.add(name)
                members.append(name)

    balances = {name: 0.0 for name in members}
    for r in rows:
        split = [n for n in r["split"] if n] or [r["paid_by"]]
        share = r["amount"] / len(split)
        balances[r["paid_by"]] = balances.get(r["paid_by"], 0.0) + r["amount"]
        for name in split:
            balances[name] = balances.get(name, 0.0) - share
    balances = {n: round(b, 2) for n, b in balances.items()}

    return {
        "expenses": rows,
        "members": members,
        "total": total,
        "per_person": round(total / len(members), 2) if members else 0.0,
        "balances": balances,
        "settlements": _settle(balances),
        "currency": rows[0]["currency"] if rows else "INR",
    }


async def get_budget(db: AsyncSession, user_id: str, trip_id: str | None = None) -> dict:
    stmt = select(Expense).where(Expense.user_id == _uuid(user_id, "user"))
    if trip_id:
        stmt = stmt.where(Expense.trip_id == _uuid(trip_id, "trip"))
    stmt = stmt.order_by(Expense.created_at.asc())
    result = await db.execute(stmt)
    return _summarize(list(result.scalars().all()))


async def add_expense(db: AsyncSession, user_id: str, data: dict) -> dict:
    expense = Expense(
        user_id=_uuid(user_id, "user"),
        trip_id=_uuid(data["trip_id"], "trip") if data.get("trip_id") else None,
        description=data["description"].strip(),
        amount=float(data["amount"]),
        category=data.get("category"),
        paid_by=data["paid_by"].strip(),
        split=[s.strip() for s in data["split"] if s and s.strip()],
        currency=data.get("currency", "INR"),
    )
    db.add(expense)
    await db.flush()
    return await get_budget(db, user_id, data.get("trip_id"))


async def delete_expense(db: AsyncSession, user_id: str, expense_id: str) -> dict:
    result = await db.execute(
        select(Expense).where(
            Expense.id == _uuid(expense_id, "expense"),
            Expense.user_id == _uuid(user_id, "user"),
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise NotFoundError("Expense not found")
    trip_id = str(expense.trip_id) if expense.trip_id else None
    await db.delete(expense)
    await db.flush()
    return await get_budget(db, user_id, trip_id)
