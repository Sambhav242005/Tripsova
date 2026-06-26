"""add expenses table

Revision ID: a1c7e9d4f2b8
Revises: 7b41c2a9e0d5
Create Date: 2026-06-21
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1c7e9d4f2b8'
down_revision: Union[str, None] = '7b41c2a9e0d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('expenses',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('trip_id', sa.Uuid(), nullable=True),
    sa.Column('description', sa.String(length=255), nullable=False),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=True),
    sa.Column('paid_by', sa.String(length=120), nullable=False),
    sa.Column('split', sa.JSON(), nullable=False),
    sa.Column('currency', sa.String(length=10), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expenses_user_id'), 'expenses', ['user_id'], unique=False)
    op.create_index(op.f('ix_expenses_trip_id'), 'expenses', ['trip_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_expenses_trip_id'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_user_id'), table_name='expenses')
    op.drop_table('expenses')
