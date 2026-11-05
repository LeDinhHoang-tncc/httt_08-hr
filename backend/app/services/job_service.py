from datetime import datetime, timezone

from sqlalchemy import or_, select, update, func
from sqlalchemy.orm import Session


from app.models.application import Application
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate
from app.models.user import User

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

def get_public_job_by_id(db: Session, job_id: int) -> Job | None:
    job = db.get(Job, job_id)

    if (
        job is None
        or job.status != "published"
        or job.is_hidden
        or job.deleted_at is not None
    ):
        return None

    return job

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
    query = select(Job).where(
        Job.status == "published",
        Job.is_hidden.is_(False),
        Job.deleted_at.is_(None),
    )

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
    # Kết thúc tuyển dụng chỉ đi qua API riêng (complete_job).
    # Tin đã kết thúc tuyển dụng thì không được chỉnh sửa nữa.
    if job.status == "completed":
        raise ValueError(
            "Tin tuyển dụng đã kết thúc, không thể chỉnh sửa."
        )
    
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
        # Nếu tin đang bị Admin ẩn, đồng bộ để khi bỏ ẩn không khôi phục
    # nhầm trạng thái cũ.
    if job.is_hidden and "status" in update_data:
        job.status_before_hidden = job.status

    try:
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        raise

    return job


def delete_job(db: Session, job: Job) -> None:
    if job.deleted_at is not None:
        raise ValueError("Tin tuyển dụng đã bị xóa.")

    has_applications = (
        db.scalar(
            select(Application.id)
            .where(Application.job_id == job.id)
            .limit(1)
        )
        is not None
    )

    try:
        if not has_applications:
            # Chưa có hồ sơ: xóa vật lý.
            db.delete(job)
        else:
            # Đã có hồ sơ: xóa mềm.
            job.deleted_at = datetime.now(timezone.utc)

            # Hồ sơ chưa có kết quả cuối cùng chuyển sang rejected.
            # Hồ sơ accepted và rejected giữ nguyên.
            db.execute(
                update(Application)
                .where(
                    Application.job_id == job.id,
                    Application.status.in_(
                        ["submitted", "reviewing", "interview"]
                    ),
                )
                .values(status="rejected")
            )

        db.commit()
    except Exception:
        db.rollback()
        raise

def complete_job(db: Session, job: Job) -> Job:
    if job.deleted_at is not None:
        raise ValueError("Tin tuyển dụng đã bị xóa.")

    if job.status != "published":
        raise ValueError(
            "Chỉ tin đang tuyển dụng mới có thể kết thúc tuyển dụng."
        )

    job.status = "completed"

    # Nếu tin đang bị Admin ẩn, đồng bộ để khi bỏ ẩn không khôi phục
    # lại trạng thái cũ "published".
    if job.is_hidden:
        job.status_before_hidden = "completed"

    try:
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        raise

    return job

def hide_job(db: Session, job: Job) -> Job:
    if job.deleted_at is not None:
        raise ValueError("Tin tuyển dụng đã bị xóa.")

    if job.is_hidden:
        raise ValueError("Tin tuyển dụng đã bị ẩn.")

    job.status_before_hidden = job.status
    job.is_hidden = True

    try:
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        raise

    return job


def unhide_job(db: Session, job: Job) -> Job:
    if job.deleted_at is not None:
        raise ValueError("Tin tuyển dụng đã bị xóa.")

    if not job.is_hidden:
        raise ValueError("Tin tuyển dụng hiện không bị ẩn.")

    if job.status_before_hidden is not None:
        job.status = job.status_before_hidden

    job.is_hidden = False
    job.status_before_hidden = None

    try:
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        raise

    return job

def search_managed_jobs(
    db: Session,
    created_by: int | None = None,
    keyword: str | None = None,
    job_status: str | None = None,
    is_hidden: bool | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Job], int]:
    # Dùng cho Recruiter (truyền created_by) và Admin (created_by = None).
    # Tin đã xóa mềm không hiển thị với ai.
    query = select(Job).where(Job.deleted_at.is_(None))

    if created_by is not None:
        query = query.where(Job.created_by == created_by)

    if keyword:
        pattern = f"%{keyword.strip()}%"
        query = query.where(
            or_(
                Job.title.ilike(pattern),
                Job.company_name.ilike(pattern),
            )
        )

    if job_status:
        query = query.where(Job.status == job_status)

    if is_hidden is not None:
        query = query.where(Job.is_hidden == is_hidden)

    total = db.scalar(
        select(func.count()).select_from(query.order_by(None).subquery())
    ) or 0

    query = (
        query.order_by(Job.created_at.desc(), Job.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    jobs = list(db.scalars(query).all())

    return jobs, total


def get_viewable_job_by_id(
    db: Session,
    job_id: int,
    viewer: User | None,
) -> Job | None:
    # viewer = None nghĩa là khách chưa đăng nhập.
    job = db.get(Job, job_id)

    if job is None or job.deleted_at is not None:
        return None

    if viewer is not None:
        if viewer.role == "admin":
            return job

        if viewer.role == "recruiter" and job.created_by == viewer.id:
            return job

    if job.status == "published" and not job.is_hidden:
        return job

    return None