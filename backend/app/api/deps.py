from collections.abc import Generator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User


#oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token"
)
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token",
    auto_error=False,
)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        subject = payload.get("sub")

        if not isinstance(subject, str):
            raise credentials_error

        user_id = int(subject)
    except (jwt.InvalidTokenError, ValueError):
        raise credentials_error

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise credentials_error

    return user
"""
def require_hr_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in ("hr", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền quản lý tin tuyển dụng.",
        )

    return current_user
"""

def get_optional_user(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    # Không có token hoặc token không hợp lệ: coi như khách.
    if token is None:
        return None

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        subject = payload.get("sub")

        if not isinstance(subject, str):
            return None

        user_id = int(subject)
    except (jwt.InvalidTokenError, ValueError):
        return None

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        return None

    return user


def require_recruiter_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in ("recruiter", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện chức năng này.",
        )

    return current_user

def require_recruiter(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới được phép thực hiện chức năng này.",
        )
    return current_user

def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ quản trị viên mới được phép thực hiện chức năng này.",
        )

    return current_user