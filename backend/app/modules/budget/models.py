import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy import Uuid as UUID

from app.database import Base


class Expense(Base):
    """A single real, user-recorded shared expense.

    The whole budget tracker is derived from these rows — totals, per-person split,
    and who-owes-whom are all *computed* from real entries, never hardcoded. ``split``
    holds the participant names the expense is divided between; ``paid_by`` is whoever
    fronted the money. Settle-up nets these across every expense.
    """

    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=True)
    paid_by = Column(String(120), nullable=False)
    split = Column(JSON, nullable=False)  # list[str] of participant names
    currency = Column(String(10), default="INR")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
