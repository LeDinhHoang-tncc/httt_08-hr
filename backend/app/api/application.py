from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
)
from app.services import application_service


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    data: ApplicationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        return application_service.create_application(
            db=db,
            data=data,
            user_id=current_user.id,
        )
    except ValueError as exc:
        message = str(exc)

        if message == "Không tìm thấy tin tuyển dụng.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )


@router.get("", response_model=list[ApplicationResponse])
def search_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    job_id: int | None = Query(default=None, gt=0),
    application_status: Literal[
        "submitted", "reviewing", "interview", "accepted", "rejected"
    ] | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    applications, _ = application_service.search_applications(
        db=db,
        user_id=current_user.id,
        job_id=job_id,
        application_status=application_status,
        page=page,
        page_size=page_size,
    )
    return applications


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    application = application_service.get_application_by_id(
        db, application_id
    )

    if application is None or application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ ứng tuyển.",
        )

    return application


@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    application = application_service.get_application_by_id(
        db, application_id
    )

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ ứng tuyển.",
        )

    # Tạm thời chỉ cho phép chủ hồ sơ gọi endpoint này.
    # Quyền HR/admin sẽ được triển khai ở giai đoạn phân quyền.
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền cập nhật hồ sơ này.",
        )

    return application_service.update_application_status(
        db=db,
        application=application,
        data=data,
    )
