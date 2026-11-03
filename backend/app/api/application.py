from typing import Annotated, Literal

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form,status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
)
from app.services import application_service, file_service


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
# hàm cũ giữ lại phòng hờ
# def create_application(
#     data: ApplicationCreate,
#     db: Annotated[Session, Depends(get_db)],
#     current_user: Annotated[User, Depends(get_current_user)],
# ):
#     try:
#         return application_service.create_application(
#             db=db,
#             data=data,
#             user_id=current_user.id,
#         )
#     except ValueError as exc:
#         message = str(exc)

#         if message == "Không tìm thấy tin tuyển dụng.":
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=message,
#             )

#         raise HTTPException(
#             status_code=status.HTTP_409_CONFLICT,
#             detail=message,
#         )
async def create_application(
    job_id: int = Form(..., gt=0),
    cover_letter:str | None = Form(default=None),
    cv_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_path = None

    try: 
    # 1 lưu cv vào server
        saved_path = await file_service.save_cv(cv_file)

    # 2 tao du lieu ho so ung tuyen
        data = ApplicationCreate(
            job_id=job_id,
            cover_letter=cover_letter,
        )
    # 3 luu thong tin ho so ung tuyen 
        return application_service.create_application(
            db=db,
            data=data,
            user_id=current_user.id,
            resume_url=saved_path,
            original_filename=cv_file.filename,
            uploaded_at=datetime.now(timezone.utc),
        )
    except ValueError as exc:
        # xoa cv neu tao ho so that bai
        if saved_path:
            file_service.delete_cv(saved_path)
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

    except Exception:
        # xoa cv neu xay ra loi khac
        if saved_path:
            file_service.delete_cv(saved_path)

        raise
    finally:
        await cv_file.close()

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
