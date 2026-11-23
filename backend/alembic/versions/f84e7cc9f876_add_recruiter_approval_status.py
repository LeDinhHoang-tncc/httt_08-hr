"""add recruiter approval status

Revision ID: f84e7cc9f876
Revises: ad2fa4fcf323
Create Date: 2026-11-19 08:50:04.431611

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f84e7cc9f876'
down_revision: Union[str, Sequence[str], None] = 'ad2fa4fcf323'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "recruiter_status",
            sa.String(length=20),
            nullable=False,
            server_default="not_requested",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "recruiter_status")
