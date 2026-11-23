from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.user import UserResponse
from app.services import admin_service


router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users")
def get_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    keyword: str | None = None,
    role: Literal["candidate", "recruiter", "admin"] | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    users, total = admin_service.search_users(
        db=db,
        keyword=keyword,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    return {
        "items": [
            UserResponse.model_validate(user)
            for user in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/recruiter-requests")
def get_recruiter_requests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    users, total = admin_service.get_pending_recruiters(
        db=db,
        page=page,
        page_size=page_size,
    )

    return {
        "items": [
            UserResponse.model_validate(user)
            for user in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch(
    "/users/{user_id}/recruiter-review",
    response_model=UserResponse,
)
def review_recruiter_request(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    approved: bool = Body(embed=True),
):
    try:
        return admin_service.review_recruiter_request(
            db=db,
            user_id=user_id,
            approved=approved,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

@router.patch(
    "/users/{user_id}/status",
    response_model=UserResponse,
)
def update_user_status(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    is_active: bool = Body(embed=True),
):
    try:
        return admin_service.update_user_status(
            db=db,
            current_admin=current_user,
            user_id=user_id,
            is_active=is_active,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

@router.get("/dashboard")
def get_dashboard_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    return admin_service.get_dashboard_statistics(db)