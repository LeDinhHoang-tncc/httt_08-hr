from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ApplicationStatus = Literal[
    "submitted",
    "reviewing",
    "interview",
    "accepted",
    "rejected",
    "withdrawn",  # ứng viên tự rút hồ sơ
]


class ApplicationCreate(BaseModel):
    job_id: int = Field(gt=0)
    cover_letter: str | None = Field(default=None, max_length=5000)


class ApplicationStatusUpdate(BaseModel):
    # Recruiter chỉ được chuyển sang các trạng thái này.
    # "withdrawn" chỉ dành cho ứng viên (endpoint riêng).
    status: Literal[
        "reviewing",
        "interview",
        "accepted",
        "rejected",
    ]


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    job_id: int
    status: ApplicationStatus
    hidden_by_candidate: bool
    cover_letter: str | None
    resume_url: str | None
    original_filename: str | None
    uploaded_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int