from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user, require_recruiter_or_admin, require_recruiter, require_admin, get_db
from app.models.user import User
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.services import job_service


router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    data: JobCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_recruiter)],
):
    try:
        return job_service.create_job(db, data, current_user.id)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo tin tuyển dụng.",
        )


@router.get("", response_model=list[JobResponse])
def search_jobs(
    db: Annotated[Session, Depends(get_db)],
    keyword: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
    min_salary: float | None = Query(default=None, ge=0),
    max_salary: float | None = Query(default=None, ge=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    jobs, _ = job_service.search_jobs(
        db=db,
        keyword=keyword,
        location=location,
        employment_type=employment_type,
        min_salary=min_salary,
        max_salary=max_salary,
        page=page,
        page_size=page_size,
    )
    return jobs

@router.get("/manage", response_model=list[JobResponse])
def search_managed_jobs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_recruiter_or_admin)],
    keyword: str | None = None,
    job_status: Literal["draft", "published", "completed"] | None = None,
    is_hidden: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    # Recruiter chỉ thấy tin của mình, Admin thấy tất cả.
    created_by = current_user.id if current_user.role == "recruiter" else None

    jobs, _ = job_service.search_managed_jobs(
        db=db,
        created_by=created_by,
        keyword=keyword,
        job_status=job_status,
        is_hidden=is_hidden,
        page=page,
        page_size=page_size,
    )
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
):
    job = job_service.get_viewable_job_by_id(db, job_id, current_user)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng.",
        )

    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_recruiter)],
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None or job.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng.",
        )

    if job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền sửa tin tuyển dụng này.",
        )

    try:
        return job_service.update_job(db, job, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )


@router.patch("/{job_id}/complete", response_model=JobResponse)
def complete_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_recruiter)],
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None or job.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng.",
        )

    if job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền kết thúc tuyển dụng tin này.",
        )

    try:
        return job_service.complete_job(db, job)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

@router.patch("/{job_id}/hide", response_model=JobResponse)
def hide_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None or job.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng.",
        )

    try:
        return job_service.hide_job(db, job)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.patch("/{job_id}/unhide", response_model=JobResponse)
def unhide_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None or job.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng.",
        )

    try:
        return job_service.unhide_job(db, job)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_recruiter)],
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None or job.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng.",
        )

    if job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa tin tuyển dụng này.",
        )

    try:
        job_service.delete_job(db, job)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)