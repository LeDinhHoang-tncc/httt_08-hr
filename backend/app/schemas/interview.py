from datetime import datetime,  timedelta, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

InterviewType = Literal["online", "offline"]

InterviewStatus = Literal[
    "scheduled",
    "completed",
    "cancelled",
    "rescheduled",
]


class InterviewSessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)

    application_ids: list[int] = Field(min_length=1)

    start_time: datetime
    end_time: datetime

    interview_type: InterviewType

    location: str | None = Field(default=None, max_length=500)
    meeting_url: str | None = Field(default=None, max_length=500)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_interview(self):
        now = datetime.now(timezone.utc)

        start_time = self.start_time

        if start_time.tzinfo is None:
            raise ValueError("Thời gian phỏng vấn phải có múi giờ hợp lệ.")

        if start_time.astimezone(timezone.utc) < now + timedelta(days=1):
            raise ValueError(
                "Lịch phỏng vấn phải được đặt trước ít nhất 24 giờ."
            )
        
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu.")

        if len(self.application_ids) != len(set(self.application_ids)):
            raise ValueError("Danh sách hồ sơ không được chứa ID trùng nhau.")

        if self.interview_type == "offline" and not self.location:
            raise ValueError("Phỏng vấn trực tiếp phải có địa điểm.")

        if self.interview_type == "online" and not self.meeting_url:
            raise ValueError("Phỏng vấn trực tuyến phải có link tham gia.")

        return self


class InterviewSessionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)

    start_time: datetime | None = None
    end_time: datetime | None = None

    interview_type: InterviewType | None = None

    location: str | None = Field(default=None, max_length=500)
    meeting_url: str | None = Field(default=None, max_length=500)
    notes: str | None = None



class InterviewCandidateSummary(BaseModel):
    application_id: int
    full_name: str
    email: str
    status: InterviewStatus



class InterviewSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    start_time: datetime
    end_time: datetime
    interview_type: InterviewType
    location: str | None
    meeting_url: str | None
    notes: str | None
    status: InterviewStatus
    created_by: int
    created_at: datetime

    candidates: list[InterviewCandidateSummary] = []


class InterviewSessionListResponse(BaseModel):
    items: list[InterviewSessionResponse]
    total: int
    page: int
    page_size: int



class CandidateInterviewSessionResponse(BaseModel):
    id: int
    application_id: int
    job_title: str
    company_name: str

    title: str
    start_time: datetime
    end_time: datetime
    interview_type: InterviewType
    location: str | None
    meeting_url: str | None
    notes: str | None
    status: InterviewStatus


class CandidateInterviewSessionListResponse(BaseModel):
    items: list[CandidateInterviewSessionResponse]
    total: int
    page: int
    page_size: int


InterviewResult = Literal[
    "accepted",
    "rejected",
    "next_round",
]


class InterviewCandidateEvaluation(BaseModel):
    application_id: int
    result: InterviewResult


class InterviewSessionComplete(BaseModel):
    evaluations: list[InterviewCandidateEvaluation] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_evaluations(self):
        application_ids = [
            item.application_id for item in self.evaluations
        ]

        if len(application_ids) != len(set(application_ids)):
            raise ValueError(
                "Không được đánh giá trùng một hồ sơ."
            )

        return self


class InterviewCandidateComplete(BaseModel):
    result: InterviewResult
