from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.user import User


def search_users(
    db: Session,
    keyword: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[User], int]:
    """Tìm kiếm và lọc danh sách tài khoản."""

    query = select(User)

    if keyword:
        search_keyword = f"%{keyword.strip()}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_keyword),
                User.email.ilike(search_keyword),
            )
        )

    if role is not None:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    count_query = select(func.count()).select_from(
        query.order_by(None).subquery()
    )
    total = db.scalar(count_query) or 0

    query = (
        query
        .order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    users = db.scalars(query).all()

    return list(users), total
