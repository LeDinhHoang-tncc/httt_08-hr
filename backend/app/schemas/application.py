from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ApplicationStatus = Literal[
    "submitted",
    "reviewing",
    "interview",
    "accepted",
    "rejected",
]


class ApplicationCreate(BaseModel):
    job_id: int = Field(gt=0)
    cover_letter: str | None = Field(default=None, max_length=5000)
    resume_url: str | None = Field(default=None, max_length=500)


class ApplicationStatusUpdate(BaseModel):
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
    cover_letter: str | None
    resume_url: str | None
    created_at: datetime
    updated_at: datetime
