"""add journeys table

Revision ID: b2d8f1a6c3e9
Revises: a1c7e9d4f2b8
Create Date: 2026-06-21
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b2d8f1a6c3e9'
down_revision: Union[str, None] = 'a1c7e9d4f2b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('journeys',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('origin', sa.String(length=255), nullable=False),
    sa.Column('destination', sa.String(length=255), nullable=False),
    sa.Column('round_trip', sa.Boolean(), nullable=True),
    sa.Column('people_count', sa.Integer(), nullable=True),
    sa.Column('budget', sa.Float(), nullable=True),
    sa.Column('departure_time', sa.DateTime(timezone=True), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('result', sa.JSON(), nullable=True),
    sa.Column('error', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_journeys_user_id'), 'journeys', ['user_id'], unique=False)
    op.create_index(op.f('ix_journeys_status'), 'journeys', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_journeys_status'), table_name='journeys')
    op.drop_index(op.f('ix_journeys_user_id'), table_name='journeys')
    op.drop_table('journeys')
