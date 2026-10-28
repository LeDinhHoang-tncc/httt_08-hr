from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate


def create_job(db: Session, data: JobCreate, user_id: int) -> Job:
    job_data = data.model_dump()

    job = Job(
        **job_data,
        created_by=user_id,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


def get_job_by_id(db: Session, job_id: int) -> Job | None:
    return db.get(Job, job_id)


def search_jobs(
    db: Session,
    keyword: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
    min_salary: float | None = None,
    max_salary: float | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Job], int]:
    query = select(Job)

    if keyword:
        pattern = f"%{keyword.strip()}%"
        query = query.where(
            or_(
                Job.title.ilike(pattern),
                Job.company_name.ilike(pattern),
                Job.description.ilike(pattern),
            )
        )

    if location:
        query = query.where(Job.location.ilike(f"%{location.strip()}%"))

    if employment_type:
        query = query.where(Job.employment_type == employment_type)

    if min_salary is not None:
        query = query.where(
            Job.salary_max.is_not(None),
            Job.salary_max >= min_salary,
        )

    if max_salary is not None:
        query = query.where(
            Job.salary_min.is_not(None),
            Job.salary_min <= max_salary,
        )

    count_query = select(Job.id).select_from(query.subquery())
    total = len(db.scalars(count_query).all())

    query = (
        query.order_by(Job.created_at.desc(), Job.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    jobs = list(db.scalars(query).all())

    return jobs, total


def update_job(
    db: Session,
    job: Job,
    data: JobUpdate,
) -> Job:
    update_data = data.model_dump(exclude_unset=True)

    # Kết hợp giá trị mới với dữ liệu hiện tại để kiểm tra khoảng lương.
    salary_min = update_data.get("salary_min", job.salary_min)
    salary_max = update_data.get("salary_max", job.salary_max)

    if (
        salary_min is not None
        and salary_max is not None
        and salary_min > salary_max
    ):
        raise ValueError(
            "Mức lương tối thiểu không được lớn hơn mức lương tối đa."
        )

    for field, value in update_data.items():
        setattr(job, field, value)

    try:
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        raise

    return job


def delete_job(db: Session, job: Job) -> None:
    try:
        db.delete(job)
        db.commit()
    except Exception:
        db.rollback()
        raise
