from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.user import User

from app.models.job import Job
from app.models.application import Application


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

def get_pending_recruiters(
    db: Session,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[User], int]:
    """Lấy danh sách tài khoản đang chờ duyệt Recruiter."""

    query = select(User).where(
        User.recruiter_status == "pending"
    )

    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total = db.scalar(count_query) or 0

    query = (
        query
        .order_by(User.created_at.asc(), User.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    users = db.scalars(query).all()

    return list(users), total


def review_recruiter_request(
    db: Session,
    user_id: int,
    approved: bool,
) -> User:
    """Admin duyệt hoặc từ chối yêu cầu Recruiter."""

    user = db.get(User, user_id)

    if user is None:
        raise ValueError("Không tìm thấy tài khoản.")

    if user.recruiter_status != "pending":
        raise ValueError("Tài khoản không có yêu cầu Recruiter đang chờ duyệt.")

    if approved:
        user.role = "recruiter"
        user.recruiter_status = "approved"
    else:
        user.role = "candidate"
        user.recruiter_status = "rejected"

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user

def update_user_status(
    db: Session,
    current_admin: User,
    user_id: int,
    is_active: bool,
) -> User:
    """Admin khóa hoặc mở khóa tài khoản Candidate/Recruiter."""

    user = db.get(User, user_id)

    if user is None:
        raise ValueError("Không tìm thấy tài khoản.")

    if user.role == "admin":
        raise ValueError("Không thể khóa hoặc mở khóa tài khoản Admin.")

    if user.id == current_admin.id:
        raise ValueError("Không thể thay đổi trạng thái tài khoản của chính mình.")

    if user.is_active == is_active:
        raise ValueError(
            "Tài khoản đã ở trạng thái này."
        )

    user.is_active = is_active

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user

def get_dashboard_statistics(db: Session) -> dict:
    """Lấy số liệu tổng quan cho Admin Dashboard."""

    # Thống kê tài khoản
    user_stats = db.execute(
        select(
            func.count(User.id).label("total"),
            func.count(User.id).filter(
                User.role == "candidate"
            ).label("candidates"),
            func.count(User.id).filter(
                User.role == "recruiter"
            ).label("recruiters"),
            func.count(User.id).filter(
                User.role == "admin"
            ).label("admins"),
            func.count(User.id).filter(
                User.is_active.is_(False)
            ).label("locked"),
        )
    ).one()

    # Thống kê tin tuyển dụng (không tính tin đã xóa)
    job_stats = db.execute(
        select(
            func.count(Job.id).label("total"),
            func.count(Job.id).filter(
                Job.status == "draft"
            ).label("draft"),
            func.count(Job.id).filter(
                Job.status == "published"
            ).label("published"),
            func.count(Job.id).filter(
                Job.status == "completed"
            ).label("completed"),
            func.count(Job.id).filter(
                Job.is_hidden.is_(True)
            ).label("hidden"),
        ).where(Job.deleted_at.is_(None))
    ).one()

    # Thống kê hồ sơ ứng tuyển
    application_stats = db.execute(
        select(
            func.count(Application.id).label("total"),
            func.count(Application.id).filter(
                Application.status == "submitted"
            ).label("submitted"),
            func.count(Application.id).filter(
                Application.status == "reviewing"
            ).label("reviewing"),
            func.count(Application.id).filter(
                Application.status == "interview"
            ).label("interview"),
            func.count(Application.id).filter(
                Application.status == "accepted"
            ).label("accepted"),
            func.count(Application.id).filter(
                Application.status == "rejected"
            ).label("rejected"),
            func.count(Application.id).filter(
                Application.status == "withdrawn"
            ).label("withdrawn"),
        )
    ).one()

    # Số yêu cầu Recruiter đang chờ duyệt
    pending_recruiters = db.scalar(
        select(func.count(User.id)).where(
            User.recruiter_status == "pending"
        )
    ) or 0

    return {
        "users": dict(user_stats._mapping),
        "jobs": dict(job_stats._mapping),
        "applications": dict(application_stats._mapping),
        "pending_recruiters": pending_recruiters,
    }