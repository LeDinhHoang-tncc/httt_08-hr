from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.job import Job
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
)


def create_application(
    db: Session,
    data: ApplicationCreate,
    user_id: int,
) -> Application:
    # Kiểm tra tin tuyển dụng có tồn tại không.
    job = db.get(Job, data.job_id)

    if job is None:
        raise ValueError("Không tìm thấy tin tuyển dụng.")

    # Kiểm tra ứng viên đã nộp hồ sơ cho tin này chưa.
    existing = db.scalar(
        select(Application).where(
            Application.user_id == user_id,
            Application.job_id == data.job_id,
        )
    )

    if existing is not None:
        raise ValueError("Bạn đã ứng tuyển vào tin tuyển dụng này.")

    application = Application(
        user_id=user_id,
        job_id=data.job_id,
        cover_letter=data.cover_letter,
        resume_url=data.resume_url,
        status="submitted",
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)
    except IntegrityError:
        db.rollback()
        # Xử lý trường hợp hai yêu cầu nộp trùng xảy ra gần như đồng thời.
        raise ValueError("Bạn đã ứng tuyển vào tin tuyển dụng này.")
    except Exception:
        db.rollback()
        raise

    return application


def get_application_by_id(
    db: Session,
    application_id: int,
) -> Application | None:
    return db.get(Application, application_id)


def search_applications(
    db: Session,
    user_id: int | None = None,
    job_id: int | None = None,
    application_status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Application], int]:
    query = select(Application)

    if user_id is not None:
        query = query.where(Application.user_id == user_id)

    if job_id is not None:
        query = query.where(Application.job_id == job_id)

    if application_status is not None:
        query = query.where(Application.status == application_status)

    count_query = select(func.count()).select_from(
        query.order_by(None).subquery()
    )
    total = db.scalar(count_query) or 0

    query = (
        query
        .order_by(Application.created_at.desc(), Application.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    applications = list(db.scalars(query).all())

    return applications, total


def update_application_status(
    db: Session,
    application: Application,
    data: ApplicationStatusUpdate,
) -> Application:
    application.status = data.status

    try:
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise

    return application
