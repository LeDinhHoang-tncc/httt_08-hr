from datetime import datetime

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.job import Job
from app.schemas.application import ApplicationCreate
from app.services import job_service


# ---------------------------------------------------------------------------
# Exception riêng: router map sang mã HTTP, không so sánh chuỗi message nữa
# ---------------------------------------------------------------------------
class ApplicationError(Exception):
    default_message = "Có lỗi xảy ra với hồ sơ ứng tuyển."

    def __init__(self, message: str | None = None):
        self.message = message or self.default_message
        super().__init__(self.message)


class JobNotFoundError(ApplicationError):
    default_message = "Không tìm thấy tin tuyển dụng."


class DuplicateApplicationError(ApplicationError):
    default_message = "Bạn đã ứng tuyển vào tin tuyển dụng này rồi."


class InvalidStatusTransitionError(ApplicationError):
    default_message = "Không thể chuyển hồ sơ sang trạng thái này."


class ApplicationNotEditableError(ApplicationError):
    default_message = "Hồ sơ đã được xử lý, không thể chỉnh sửa."

class ApplicationNotHideableError(ApplicationError):
    default_message = "Không thể ẩn hồ sơ ở trạng thái hiện tại."
# ---------------------------------------------------------------------------
# Quy tắc chuyển trạng thái (chỉnh theo quy trình tuyển dụng thực tế của bạn)
# ---------------------------------------------------------------------------
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "submitted": {"reviewing", "interview", "rejected"},
    "reviewing": {"interview", "accepted", "rejected"},
    "interview": {"accepted", "rejected"},
    "accepted": set(),
    "rejected": set(),
    "withdrawn": set(),
}

# Ứng viên chỉ được rút khi hồ sơ chưa tiến tới phỏng vấn
WITHDRAWABLE_STATUSES = {"submitted"}

# Ứng viên chỉ được sửa hồ sơ khi nhà tuyển dụng chưa xử lý
EDITABLE_STATUSES = {"submitted"}

# Ứng viên được xóa hồ sơ 
HIDEABLE_STATUSES = {"accepted", "rejected", "withdrawn"}

# ---------------------------------------------------------------------------
# Nộp hồ sơ
# ---------------------------------------------------------------------------
def check_can_apply(db: Session, job_id: int, user_id: int) -> Job:
    """Kiểm tra tin tuyển dụng và điều kiện ứng tuyển lại."""
    job = job_service.get_public_job_by_id(db, job_id)
    if job is None:
        raise JobNotFoundError()

    existing = db.scalar(
        select(Application).where(
            Application.user_id == user_id,
            Application.job_id == job_id,
        )
    )

    if existing is not None:
        if existing.status not in {"rejected", "withdrawn"}:
            raise DuplicateApplicationError()

    return job


def create_application(
    db: Session,
    data: ApplicationCreate,
    user_id: int,
    resume_url: str,
    original_filename: str | None,
    uploaded_at: datetime,
) -> Application:
    check_can_apply(db, data.job_id, user_id)

    existing = db.scalar(
        select(Application).where(
            Application.user_id == user_id,
            Application.job_id == data.job_id,
        )
    )

    try:
        if existing is not None:
            # Tái sử dụng hồ sơ cũ
            existing.cover_letter = data.cover_letter
            existing.resume_url = resume_url
            existing.original_filename = original_filename
            existing.uploaded_at = uploaded_at
            existing.status = "submitted"
            existing.hidden_by_candidate = False

            application = existing
        else:
            # Chưa từng ứng tuyển: tạo hồ sơ mới
            application = Application(
                user_id=user_id,
                job_id=data.job_id,
                cover_letter=data.cover_letter,
                resume_url=resume_url,
                original_filename=original_filename,
                uploaded_at=uploaded_at,
                status="submitted",
                hidden_by_candidate=False,
            )
            db.add(application)

        db.commit()
        db.refresh(application)

    except IntegrityError:
        db.rollback()
        raise DuplicateApplicationError()
    except Exception:
        db.rollback()
        raise

    return application


# ---------------------------------------------------------------------------
# Truy vấn
# ---------------------------------------------------------------------------
def get_application_by_id(
    db: Session,
    application_id: int,
) -> Application | None:
    return db.get(Application, application_id)


def is_job_owner(db: Session, application: Application, user_id: int) -> bool:
    job = db.get(Job, application.job_id)
    return job is not None and job.created_by == user_id


def _paginate(
    db: Session,
    query: Select,
    page: int,
    page_size: int,
) -> tuple[list[Application], int]:
    count_query = select(func.count()).select_from(
        query.order_by(None).subquery()
    )
    total = db.scalar(count_query) or 0

    query = (
        query.order_by(Application.created_at.desc(), Application.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(query).all()), total


def search_applications(
    db: Session,
    user_id: int | None = None,
    job_id: int | None = None,
    application_status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Application], int]:
    """Danh sách hồ sơ của một ứng viên."""
    query = select(Application)

    if user_id is not None:
        query = query.where(
            Application.user_id == user_id,
            Application.hidden_by_candidate.is_(False),
        )
    if job_id is not None:
        query = query.where(Application.job_id == job_id)
    if application_status is not None:
        query = query.where(Application.status == application_status)

    return _paginate(db, query, page, page_size)


def search_received_applications(
    db: Session,
    recruiter_id: int,
    job_id: int | None = None,
    application_status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Application], int]:
    """Hồ sơ ứng tuyển vào các tin do recruiter này đăng."""
    query = (
        select(Application)
        .join(Job, Job.id == Application.job_id)
        .where(
            Job.created_by == recruiter_id,
            Application.hidden_by_candidate.is_(False),
        )
    )

    if job_id is not None:
        query = query.where(Application.job_id == job_id)
    if application_status is not None:
        query = query.where(Application.status == application_status)

    return _paginate(db, query, page, page_size)


def search_all_applications(
    db: Session,
    job_id: int | None = None,
    application_status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Application], int]:
    """Admin xem tất cả hồ sơ, bao gồm cả hồ sơ đã bị ẩn."""
    query = select(Application)

    if job_id is not None:
        query = query.where(Application.job_id == job_id)

    if application_status is not None:
        query = query.where(Application.status == application_status)

    return _paginate(db, query, page, page_size)

# ---------------------------------------------------------------------------
# Đổi trạng thái
# ---------------------------------------------------------------------------
def _change_status(
    db: Session,
    application: Application,
    new_status: str,
) -> Application:
    application.status = new_status
    try:
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise
    return application


def update_application_status(
    db: Session,
    application: Application,
    new_status: str,
) -> Application:
    """Recruiter đổi trạng thái, có kiểm tra luồng hợp lệ."""
    allowed = ALLOWED_TRANSITIONS.get(application.status, set())
    if new_status not in allowed:
        raise InvalidStatusTransitionError(
            f"Không thể chuyển từ '{application.status}' sang '{new_status}'."
        )
    return _change_status(db, application, new_status)


def withdraw_application(
    db: Session,
    application: Application,
) -> Application:
    """Ứng viên tự rút hồ sơ."""
    if application.status not in WITHDRAWABLE_STATUSES:
        raise InvalidStatusTransitionError(
            "Hồ sơ đã được xử lý, không thể rút."
        )
    return _change_status(db, application, "withdrawn")

def hide_application(
    db: Session,
    application: Application,
) -> Application:
    """Ứng viên ẩn đơn đã được chấp nhận, từ chối hoặc rút."""
    if application.status not in HIDEABLE_STATUSES:
        raise ApplicationNotHideableError()

    application.hidden_by_candidate = True

    try:
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise

    return application


def unhide_application(
    db: Session,
    application: Application,
) -> Application:
    """Admin khôi phục hồ sơ đã bị ứng viên ẩn."""
    application.hidden_by_candidate = False

    try:
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise

    return application

# ---------------------------------------------------------------------------
# Ứng viên cập nhật hồ sơ đã nộp
# ---------------------------------------------------------------------------
def ensure_editable(application: Application) -> None:
    if application.status not in EDITABLE_STATUSES:
        raise ApplicationNotEditableError()


def update_application(
    db: Session,
    application: Application,
    cover_letter: str | None = None,
    new_resume_url: str | None = None,
    new_original_filename: str | None = None,
    uploaded_at: datetime | None = None,
) -> Application:
    """
    Cập nhật thư xin việc và/hoặc CV.
    - cover_letter=None: giữ nguyên; chuỗi rỗng: xóa thư xin việc.
    - new_resume_url=None: giữ nguyên CV cũ.
    Việc xóa file CV cũ do router đảm nhiệm sau khi commit thành công.
    """
    ensure_editable(application)

    if cover_letter is not None:
        application.cover_letter = cover_letter.strip() or None

    if new_resume_url is not None:
        application.resume_url = new_resume_url
        application.original_filename = new_original_filename
        application.uploaded_at = uploaded_at

    try:
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise

    return application