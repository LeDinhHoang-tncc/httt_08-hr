from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


JobStatus = Literal["draft", "published", "closed"]
EmploymentType = Literal[
    "full_time",
    "part_time",
    "internship",
    "contract",
]


class JobCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    company_name: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10)
    requirements: str | None = None
    location: str = Field(min_length=2, max_length=200)
    employment_type: EmploymentType = "full_time"
    salary_min: Decimal | None = Field(default=None, ge=0)
    salary_max: Decimal | None = Field(default=None, ge=0)
    status: JobStatus = "draft"

    @model_validator(mode="after")
    def validate_salary_range(self):
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError(
                "Mức lương tối thiểu không được lớn hơn mức lương tối đa."
            )
        return self


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    company_name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, min_length=10)
    requirements: str | None = None
    location: str | None = Field(default=None, min_length=2, max_length=200)
    employment_type: EmploymentType | None = None
    salary_min: Decimal | None = Field(default=None, ge=0)
    salary_max: Decimal | None = Field(default=None, ge=0)
    status: JobStatus | None = None

    @model_validator(mode="after")
    def validate_salary_range(self):
        min_salary = self.salary_min
        max_salary = self.salary_max

        if min_salary is not None and max_salary is not None:
            if min_salary > max_salary:
                raise ValueError(
                    "Mức lương tối thiểu không được lớn hơn mức lương tối đa."
                )
        return self


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    company_name: str
    description: str
    requirements: str | None
    location: str
    employment_type: str
    salary_min: Decimal | None
    salary_max: Decimal | None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime
