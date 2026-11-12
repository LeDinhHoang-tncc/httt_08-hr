from datetime import datetime, timezone
from typing import Annotated, Literal
from sqlalchemy import select

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.application import Application
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationStatusUpdate,
)
from app.services import application_service, file_service
from app.services.application_service import (
    ApplicationError,
    ApplicationNotEditableError,
    ApplicationNotHideableError,
    DuplicateApplicationError,
    InvalidStatusTransitionError,
    JobNotFoundError,
)


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)

DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[User, Depends(get_current_user)]

ApplicationStatusFilter = Literal[
    "submitted", "reviewing", "interview", "accepted", "rejected", "withdrawn"
]

NOT_FOUND_MSG = "Không tìm thấy hồ sơ ứng tuyển."

_ERROR_STATUS: dict[type[ApplicationError], int] = {
    JobNotFoundError: status.HTTP_404_NOT_FOUND,
    DuplicateApplicationError: status.HTTP_409_CONFLICT,
    InvalidStatusTransitionError: status.HTTP_409_CONFLICT,
    ApplicationNotEditableError: status.HTTP_409_CONFLICT,
    ApplicationNotHideableError: status.HTTP_409_CONFLICT,
}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _to_http(exc: ApplicationError) -> HTTPException:
    return HTTPException(
        status_code=_ERROR_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST),
        detail=exc.message,
    )


def _cleanup_cv(saved_path: str | None) -> None:
    """Xóa CV mồ côi, không để lỗi dọn dẹp che mất lỗi gốc."""
    if not saved_path:
        return
    try:
        file_service.delete_cv(saved_path)
    except (ValueError, OSError):
        pass


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=NOT_FOUND_MSG,
    )


def _get_viewable_application(
    db: Session,
    application_id: int,
    user: User,
) -> Application:
    """
    Candidate: chỉ xem hồ sơ của mình và chưa bị ẩn.
    Recruiter: chỉ xem hồ sơ thuộc tin mình đăng và chưa bị ẩn.
    Admin: xem được tất cả hồ sơ, kể cả đã ẩn.
    """
    application = application_service.get_application_by_id(db, application_id)

    if application is None:
        raise _not_found()

    if user.role == "admin":
        return application

    if user.role == "candidate":
        allowed = (
            application.user_id == user.id
            and not application.hidden_by_candidate
        )

    elif user.role == "recruiter":
        allowed = (
            not application.hidden_by_candidate
            and application_service.is_job_owner(
                db, application, user.id
            )
        )

    else:
        allowed = False

    if not allowed:
        raise _not_found()

    return application


def _build_list_response(
    applications: list[Application],
    total: int,
    page: int,
    page_size: int,
) -> ApplicationListResponse:
    return ApplicationListResponse(
        items=[ApplicationResponse.model_validate(a) for a in applications],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# Candidate: nộp hồ sơ
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_application(
    db: DbDep,
    current_user: UserDep,
    job_id: int = Form(..., gt=0),
    cover_letter: str | None = Form(default=None, max_length=5000),
    cv_file: UploadFile = File(...),
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ ứng viên mới được nộp hồ sơ.",
        )

    saved_path: str | None = None

    try:
        # Lấy hồ sơ cũ để giữ lại đường dẫn CV
        existing = db.scalar(
            select(Application).where(
                Application.user_id == current_user.id,
                Application.job_id == job_id,
            )
        )
        old_path = existing.resume_url if existing else None

        # Kiểm tra điều kiện ứng tuyển
        application_service.check_can_apply(db, job_id, current_user.id)

        # Lưu CV mới
        saved_path = await file_service.save_cv(cv_file)

        # Tạo mới hoặc cập nhật hồ sơ cũ
        data = ApplicationCreate(
            job_id=job_id,
            cover_letter=cover_letter,
        )

        application = application_service.create_application(
            db=db,
            data=data,
            user_id=current_user.id,
            resume_url=saved_path,
            original_filename=cv_file.filename,
            uploaded_at=datetime.now(timezone.utc),
        )

        # Chỉ xóa CV cũ sau khi database cập nhật thành công
        if old_path and old_path != saved_path:
            _cleanup_cv(old_path)

        return application

    except ApplicationError as exc:
        _cleanup_cv(saved_path)
        raise _to_http(exc) from exc
    except Exception:
        _cleanup_cv(saved_path)
        raise
    finally:
        await cv_file.close()


# ---------------------------------------------------------------------------
# Candidate: danh sách hồ sơ của mình
# ---------------------------------------------------------------------------
@router.get("", response_model=ApplicationListResponse)
def search_my_applications(
    db: DbDep,
    current_user: UserDep,
    job_id: int | None = Query(default=None, gt=0),
    application_status: ApplicationStatusFilter | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    applications, total = application_service.search_applications(
        db=db,
        user_id=current_user.id,
        job_id=job_id,
        application_status=application_status,
        page=page,
        page_size=page_size,
    )
    return _build_list_response(applications, total, page, page_size)


# ---------------------------------------------------------------------------
# Recruiter: hồ sơ nhận được
# LƯU Ý: phải khai báo TRƯỚC "/{application_id}", nếu không "received"
# sẽ bị hiểu là application_id và trả 422.
# ---------------------------------------------------------------------------
@router.get("/received", response_model=ApplicationListResponse)
def search_received_applications(
    db: DbDep,
    current_user: UserDep,
    job_id: int | None = Query(default=None, gt=0),
    application_status: ApplicationStatusFilter | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới xem được hồ sơ nhận về.",
        )

    applications, total = application_service.search_received_applications(
        db=db,
        recruiter_id=current_user.id,
        job_id=job_id,
        application_status=application_status,
        page=page,
        page_size=page_size,
    )
    return _build_list_response(applications, total, page, page_size)

# ---------------------------------------------------------------------------
# Chi tiết + tải CV (candidate chủ hồ sơ hoặc recruiter chủ tin)
# ---------------------------------------------------------------------------
@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    db: DbDep,
    current_user: UserDep,
):
    return _get_viewable_application(db, application_id, current_user)


# ---------------------------------------------------------------------------
# Admin: xem tất cả hồ sơ, bao gồm hồ sơ đã ẩn
# ---------------------------------------------------------------------------
@router.get("/admin", response_model=ApplicationListResponse)
def search_all_applications(
    db: DbDep,
    current_user: UserDep,
    job_id: int | None = Query(default=None, gt=0),
    application_status: ApplicationStatusFilter | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Admin mới được xem toàn bộ hồ sơ.",
        )

    applications, total = application_service.search_all_applications(
        db=db,
        job_id=job_id,
        application_status=application_status,
        page=page,
        page_size=page_size,
    )

    return _build_list_response(applications, total, page, page_size)

@router.get("/{application_id}/cv")
def download_application_cv(
    application_id: int,
    db: DbDep,
    current_user: UserDep,
):
    application = _get_viewable_application(db, application_id, current_user)

    if not application.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ này chưa có CV.",
        )

    try:
        file_path = file_service.get_cv_path(application.resume_url)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy file CV.",
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đường dẫn file CV không hợp lệ.",
        )

    return FileResponse(
        path=file_path,
        filename=application.original_filename or file_path.name,
        media_type=file_service.ALLOWED_EXTENSIONS.get(
            file_path.suffix.lower()
        ),
        headers={"Cache-Control": "no-store"},
    )


# ---------------------------------------------------------------------------
# Recruiter: đổi trạng thái hồ sơ
# ---------------------------------------------------------------------------
@router.patch("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    db: DbDep,
    current_user: UserDep,
):
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới được cập nhật trạng thái hồ sơ.",
        )

    application = application_service.get_application_by_id(db, application_id)

    if (
        application is None
        or application.hidden_by_candidate
        or not application_service.is_job_owner(
            db, application, current_user.id
        )
    ):
        raise _not_found()

    try:
        return application_service.update_application_status(
            db=db,
            application=application,
            new_status=data.status,
        )
    except ApplicationError as exc:
        raise _to_http(exc) from exc


# ---------------------------------------------------------------------------
# Candidate: rút hồ sơ
# ---------------------------------------------------------------------------
@router.post("/{application_id}/withdraw", response_model=ApplicationResponse)
def withdraw_application(
    application_id: int,
    db: DbDep,
    current_user: UserDep,
):
    application = application_service.get_application_by_id(db, application_id)

    if (
        application is None
        or current_user.role != "candidate"
        or application.user_id != current_user.id
    ):
        raise _not_found()

    try:
        return application_service.withdraw_application(db, application)
    except ApplicationError as exc:
        raise _to_http(exc) from exc


# ---------------------------------------------------------------------------
# Candidate: ẩn hồ sơ đã được chấp nhận, từ chối hoặc rút
# ---------------------------------------------------------------------------
@router.post("/{application_id}/hide", response_model=ApplicationResponse)
def hide_application(
    application_id: int,
    db: DbDep,
    current_user: UserDep,
):
    application = application_service.get_application_by_id(
        db, application_id
    )

    if (
        application is None
        or current_user.role != "candidate"
        or application.user_id != current_user.id
    ):
        raise _not_found()

    try:
        return application_service.hide_application(db, application)
    except ApplicationError as exc:
        raise _to_http(exc) from exc

# ---------------------------------------------------------------------------
# Admin: khôi phục hồ sơ đã bị ứng viên ẩn
# ---------------------------------------------------------------------------
@router.post("/{application_id}/unhide", response_model=ApplicationResponse)
def unhide_application(
    application_id: int,
    db: DbDep,
    current_user: UserDep,
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Admin mới được khôi phục hồ sơ.",
        )

    application = application_service.get_application_by_id(
        db, application_id
    )

    if application is None:
        raise _not_found()

    return application_service.unhide_application(db, application)

# ---------------------------------------------------------------------------
# Candidate: cập nhật hồ sơ đã nộp (chỉ khi còn "submitted")
# Gửi multipart/form-data, trường nào gửi thì cập nhật trường đó.
# ---------------------------------------------------------------------------
@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int,
    db: DbDep,
    current_user: UserDep,
    cover_letter: str | None = Form(default=None, max_length=5000),
    cv_file: UploadFile | None = File(default=None),
):
    new_file = cv_file is not None and bool(cv_file.filename)
    new_path: str | None = None

    try:
        application = application_service.get_application_by_id(
            db, application_id
        )

        if (
            application is None
            or current_user.role != "candidate"
            or application.user_id != current_user.id
        ):
            raise _not_found()

        if cover_letter is None and not new_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng gửi cover_letter hoặc cv_file để cập nhật.",
            )

        # Kiểm tra trạng thái TRƯỚC khi ghi file mới
        application_service.ensure_editable(application)

        old_path = application.resume_url

        # 1. Lưu CV mới (nếu có)
        if new_file:
            new_path = await file_service.save_cv(cv_file)

        # 2. Cập nhật DB
        updated = application_service.update_application(
            db=db,
            application=application,
            cover_letter=cover_letter,
            new_resume_url=new_path,
            new_original_filename=cv_file.filename if new_file else None,
            uploaded_at=datetime.now(timezone.utc) if new_file else None,
        )

        # 3. DB đã commit -> mới xóa CV cũ
        if new_path and old_path:
            _cleanup_cv(old_path)

        return updated

    except ApplicationError as exc:
        _cleanup_cv(new_path)
        raise _to_http(exc) from exc
    except Exception:
        _cleanup_cv(new_path)
        raise
    finally:
        if cv_file is not None:
            await cv_file.close()