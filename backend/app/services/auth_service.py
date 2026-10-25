from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.user import UserRegister


def register_user(db: Session, data: UserRegister) -> User:
    """Đăng ký tài khoản ứng viên mới."""

    email = str(data.email).strip().lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise ValueError("Email đã được sử dụng.")

    user = User(
        email=email,
        full_name=data.full_name.strip(),
        hashed_password=hash_password(data.password),
        role="candidate",
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


def login_user(
    db: Session,
    email: str,
    password: str,
) -> tuple[User, str]:
    """Xác thực tài khoản và tạo access token."""

    normalized_email = email.strip().lower()

    user = db.scalar(
        select(User).where(User.email == normalized_email)
    )

    if (
        user is None
        or not verify_password(password, user.hashed_password)
    ):
        raise ValueError("Email hoặc mật khẩu không chính xác.")

    if not user.is_active:
        raise ValueError("Tài khoản đã bị vô hiệu hóa.")

    token = create_access_token(user.id)

    return user, token
