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

class AdminApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: ApplicationStatus
    hidden_by_candidate: bool

    candidate_name: str
    candidate_email: str

    job_title: str
    company_name: str

    created_at: datetime

class CandidateSummary(BaseModel):
    full_name: str
    email: str


class JobSummary(BaseModel):
    title: str
    company_name: str


class ReceivedApplicationResponse(ApplicationResponse):
    candidate: CandidateSummary
    job: JobSummary


class ReceivedApplicationListResponse(BaseModel):
    items: list[ReceivedApplicationResponse]
    total: int
    page: int
    page_size: int

class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int

class AdminApplicationListResponse(BaseModel):
    items: list[AdminApplicationResponse]
    total: int
    page: int
    page_size: int