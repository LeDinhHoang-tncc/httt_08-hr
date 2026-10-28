from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    title: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True
    )

    company_name: Mapped[str] = mapped_column(
        String(150), nullable=False, index=True
    )

    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    requirements: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    location: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True
    )

    employment_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="full_time"
    )

    salary_min: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    salary_max: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="draft", index=True
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
