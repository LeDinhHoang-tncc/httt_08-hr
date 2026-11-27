from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.application import Application
from app.models.interview_session import InterviewSession
from app.models.interview_session_application import InterviewSessionApplication
from app.models.job import Job
from app.models.user import User
from app.schemas.interview import (
    InterviewSessionCreate,
    InterviewSessionResponse,
    InterviewSessionListResponse,
    InterviewCandidateSummary,
    CandidateInterviewSessionResponse,
    CandidateInterviewSessionListResponse,
    InterviewSessionComplete,
    InterviewCandidateComplete,
)



router = APIRouter( prefix="/api/interviews", tags=["Interviews"],)

DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[User, Depends(get_current_user)]



@router.post( "", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED,)
def create_interview_session( data: InterviewSessionCreate, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được tạo hoặc dời lịch
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền lên lịch phỏng vấn.",
        )

    # Lấy các hồ sơ được chọn
    applications = db.scalars(
        select(Application).where(
            Application.id.in_(data.application_ids),
            Application.status == "interview",
            Application.hidden_by_candidate.is_(False),
        )
    ).all()

    if len(applications) != len(data.application_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một hoặc nhiều hồ sơ không hợp lệ hoặc chưa ở trạng thái phỏng vấn.",
        )

    # Kiểm tra quyền quản lý và công việc
    job_ids = set()

    for application in applications:
        job = db.get(Job, application.job_id)

        if not job or job.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền lên lịch cho một hoặc nhiều hồ sơ đã chọn.",
            )

        job_ids.add(application.job_id)

    if len(job_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo một buổi phỏng vấn cho các hồ sơ thuộc nhiều công việc khác nhau.",
        )

    # Lấy toàn bộ lịch sử của các ứng viên được chọn
    old_records = db.execute(
        select(InterviewSessionApplication, InterviewSession)
        .join(
            InterviewSession,
            InterviewSession.id == InterviewSessionApplication.session_id,
        )
        .where(
            InterviewSessionApplication.application_id.in_(
                data.application_ids
            )
        )
    ).all()

    history_by_application = {
        application_id: []
        for application_id in data.application_ids
    }

    for link, old_session in old_records:
        history_by_application[link.application_id].append(
            (link, old_session)
        )

    # Tìm lịch cũ có thể thay thế của từng ứng viên
    links_to_reschedule = []

    for application_id in data.application_ids:
        history = history_by_application[application_id]

        eligible_links = [
            (link, old_session)
            for link, old_session in history
            if (
                link.status in ["scheduled", "cancelled"]
                and old_session.status in ["scheduled", "cancelled"]
            )
        ]

        active_links = [
            (link, old_session)
            for link, old_session in eligible_links
            if (
                link.status == "scheduled"
                and old_session.status == "scheduled"
            )
        ]

        if len(active_links) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hồ sơ {application_id} có nhiều lịch đang có hiệu lực.",
            )

        if active_links:
            selected_link = active_links[0]

        else:
            cancelled_links = [
                (link, old_session)
                for link, old_session in eligible_links
                if link.status == "cancelled"
            ]

            if cancelled_links:
                selected_link = max(
                    cancelled_links,
                    key=lambda item: item[1].created_at,
                )

            elif any(link.status == "completed" for link, _ in history):
                # Đã hoàn tất phỏng vấn trước đó:
                # cho phép tạo lịch vòng tiếp theo.
                continue

            elif history:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Hồ sơ {application_id} đã có lịch sử phỏng vấn "
                        "nhưng không có lịch nào có thể thay thế."
                    ),
                )

            else:
                # Ứng viên chưa từng có lịch
                continue

        link, old_session = selected_link

        # Kiểm tra quyền sở hữu lịch cũ
        if old_session.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thay thế một hoặc nhiều lịch phỏng vấn.",
            )

        links_to_reschedule.append((link, old_session))

    # Đánh dấu lịch cũ của các ứng viên được chọn
    old_sessions_to_check = {}

    for link, old_session in links_to_reschedule:
        link.status = "rescheduled"
        old_sessions_to_check[old_session.id] = old_session

    # Cập nhật trạng thái các buổi cũ nếu tất cả ứng viên đã được dời
    for old_session in old_sessions_to_check.values():
        all_links = db.scalars(
            select(InterviewSessionApplication).where(
                InterviewSessionApplication.session_id == old_session.id
            )
        ).all()

        if all(link.status == "rescheduled" for link in all_links):
            old_session.status = "rescheduled"

    # Tạo duy nhất một buổi phỏng vấn mới
    new_session = InterviewSession(
        title=data.title,
        start_time=data.start_time,
        end_time=data.end_time,
        interview_type=data.interview_type,
        location=data.location,
        meeting_url=data.meeting_url,
        notes=data.notes,
        created_by=current_user.id,
    )

    db.add(new_session)
    db.flush()

    # Liên kết tất cả ứng viên được chọn vào cùng một buổi
    for application in applications:
        db.add(
            InterviewSessionApplication(
                session_id=new_session.id,
                application_id=application.id,
                status="scheduled",
            )
        )

    db.commit()
    db.refresh(new_session)

    return InterviewSessionResponse(
        id=new_session.id,
        title=new_session.title,
        start_time=new_session.start_time,
        end_time=new_session.end_time,
        interview_type=new_session.interview_type,
        location=new_session.location,
        meeting_url=new_session.meeting_url,
        notes=new_session.notes,
        status=new_session.status,
        created_by=new_session.created_by,
        created_at=new_session.created_at,
        candidates=[],
    )

@router.get( "", response_model=InterviewSessionListResponse,)
def get_my_interview_sessions( db: DbDep, current_user: UserDep, page: int = Query(default=1, ge=1), page_size: int = Query(default=10, ge=1, le=100),):
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền xem lịch phỏng vấn.",
        )

    # Lọc lịch do recruiter hiện tại tạo
    base_query = select(InterviewSession).where(
        InterviewSession.created_by == current_user.id
    )

    total = db.scalar(
        select(func.count()).select_from(base_query.subquery())
    ) or 0

    sessions = db.scalars(
        base_query
        .order_by(InterviewSession.start_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []

    for session in sessions:
        # Lấy các hồ sơ thuộc buổi phỏng vấn
        linked_applications = db.execute(
            select(Application, User, InterviewSessionApplication)
            .join(
                InterviewSessionApplication,
                InterviewSessionApplication.application_id == Application.id,
            )
            .join(User, User.id == Application.user_id)
            .where(
                InterviewSessionApplication.session_id == session.id
            )
        ).all()

        candidates = [
            InterviewCandidateSummary(
                application_id=application.id,
                full_name=candidate.full_name,
                email=candidate.email,
                status=session_application.status,
            )
            for application, candidate, session_application in linked_applications
        ]
        items.append(
            InterviewSessionResponse(
                id=session.id,
                title=session.title,
                start_time=session.start_time,
                end_time=session.end_time,
                interview_type=session.interview_type,
                location=session.location,
                meeting_url=session.meeting_url,
                notes=session.notes,
                status=session.status,
                created_by=session.created_by,
                created_at=session.created_at,
                candidates=candidates,
            )
        )

    return InterviewSessionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get( "/my", response_model=CandidateInterviewSessionListResponse,)
def get_candidate_interview_sessions( db: DbDep, current_user: UserDep, page: int = Query(default=1, ge=1), page_size: int = Query(default=10, ge=1, le=100),):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ ứng viên mới có quyền xem lịch phỏng vấn của mình.",
        )

    base_query = (
        select(InterviewSession, Application, Job, InterviewSessionApplication)
        .join(
            InterviewSessionApplication,
            InterviewSessionApplication.session_id == InterviewSession.id,
        )
        .join(
            Application,
            Application.id == InterviewSessionApplication.application_id,
        )
        .join(Job, Job.id == Application.job_id)
        .where(Application.user_id == current_user.id)
    )

    total = db.scalar(
        select(func.count()).select_from(base_query.subquery())
    ) or 0

    results = db.execute(
        base_query
        .order_by(InterviewSession.start_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = [
        CandidateInterviewSessionResponse(
            id=session.id,
            application_id=application.id,
            job_title=job.title,
            company_name=job.company_name,
            title=session.title,
            start_time=session.start_time,
            end_time=session.end_time,
            interview_type=session.interview_type,
            location=session.location,
            meeting_url=session.meeting_url,
            notes=session.notes,
            status=session_application.status,
        )
        for session, application, job, session_application in results
    ]

    return CandidateInterviewSessionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

@router.patch("/{session_id}/cancel")
def cancel_interview_session( session_id: int, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được hủy lịch
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền hủy lịch phỏng vấn.",
        )

    # Tìm lịch phỏng vấn
    interview_session = db.get(InterviewSession, session_id)

    if not interview_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch phỏng vấn.",
        )

    # Chỉ người tạo lịch mới được hủy
    if interview_session.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền hủy lịch phỏng vấn này.",
        )

    # Chỉ hủy lịch đang được lên kế hoạch
    if interview_session.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể hủy lịch đang ở trạng thái scheduled.",
        )

    # Hủy lịch phỏng vấn
    interview_session.status = "cancelled"

    # Cập nhật trạng thái lịch của tất cả ứng viên tham gia
    session_applications = db.scalars(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id
        )
    ).all()

    for session_application in session_applications:
        session_application.status = "cancelled"

    db.commit()
    db.refresh(interview_session)

    return {
        "message": "Đã hủy lịch phỏng vấn.",
        "id": interview_session.id,
        "status": interview_session.status,
    }


@router.patch("/{session_id}/applications/{application_id}/cancel")
def cancel_candidate_interview( session_id: int, application_id: int, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được hủy lịch
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền hủy lịch phỏng vấn.",
        )

    # Tìm buổi phỏng vấn
    interview_session = db.get(InterviewSession, session_id)

    if not interview_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch phỏng vấn.",
        )

    # Chỉ người tạo lịch mới được hủy
    if interview_session.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền hủy lịch phỏng vấn này.",
        )

    # Chỉ xử lý buổi phỏng vấn đang hoạt động
    if interview_session.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buổi phỏng vấn không còn ở trạng thái scheduled.",
        )

    # Tìm ứng viên trong buổi phỏng vấn
    session_application = db.scalar(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id,
            InterviewSessionApplication.application_id == application_id,
        )
    )

    if not session_application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ không thuộc buổi phỏng vấn này.",
        )

    # Chỉ hủy lịch của ứng viên đang scheduled
    if session_application.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lịch của ứng viên không còn ở trạng thái scheduled.",
        )

    # Hủy lịch riêng của ứng viên
    session_application.status = "cancelled"

    # Kiểm tra còn ứng viên nào đang scheduled không
    remaining_candidates = db.scalar(
        select(func.count()).select_from(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id,
            InterviewSessionApplication.status == "scheduled",
        )
    ) or 0

    # Nếu không còn ứng viên scheduled, xác định trạng thái cuối của buổi phỏng vấn
    if remaining_candidates == 0:
        completed_candidates = db.scalar(
            select(func.count()).select_from(
                InterviewSessionApplication
            ).where(
                InterviewSessionApplication.session_id == session_id,
                InterviewSessionApplication.status == "completed",
            )
        ) or 0

        if completed_candidates > 0:
            interview_session.status = "completed"
        else:
            interview_session.status = "cancelled"
    db.commit()
    db.refresh(interview_session)

    return {
        "message": "Đã hủy lịch phỏng vấn của ứng viên.",
        "session_id": session_id,
        "application_id": application_id,
        "application_status": session_application.status,
        "session_status": interview_session.status,
    }


@router.post( "/{session_id}/reschedule", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED,)
def reschedule_interview_session( session_id: int, data: InterviewSessionCreate, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được dời lịch
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền dời lịch phỏng vấn.",
        )

    # Tìm lịch cũ
    old_session = db.get(InterviewSession, session_id)

    if not old_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch phỏng vấn cũ.",
        )

    # Chỉ người tạo lịch cũ mới được dời lịch
    if old_session.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền dời lịch phỏng vấn này.",
        )

    # Không cho dời lịch đã hoàn thành hoặc đã được xử lý dời
    if old_session.status not in ["scheduled", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buổi phỏng vấn này không thể tiếp tục dời lịch.",
        )

    # Lấy các hồ sơ được chọn trong lịch cũ
    old_links = db.scalars(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id,
            InterviewSessionApplication.application_id.in_(
                data.application_ids
            ),
        )
    ).all()

    # Kiểm tra tất cả hồ sơ có thuộc lịch cũ không
    if len(old_links) != len(data.application_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một hoặc nhiều hồ sơ không thuộc buổi phỏng vấn cũ.",
        )

    # Chỉ thay thế lịch đang có hiệu lực hoặc lịch đã hủy
    if any(link.status not in ["scheduled", "cancelled"] for link in old_links):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lịch của một hoặc nhiều ứng viên đã được xử lý, không thể thay thế.",
        )

    # Lấy thông tin các hồ sơ
    applications = db.scalars(
        select(Application).where(
            Application.id.in_(data.application_ids),
            Application.status == "interview",
            Application.hidden_by_candidate.is_(False),
        )
    ).all()

    if len(applications) != len(data.application_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một hoặc nhiều hồ sơ không hợp lệ hoặc không còn ở trạng thái phỏng vấn.",
        )

    # Kiểm tra quyền quản lý và công việc của các hồ sơ
    job_ids = set()

    for application in applications:
        job = db.get(Job, application.job_id)

        if not job or job.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền dời lịch cho một hoặc nhiều hồ sơ đã chọn.",
            )

        job_ids.add(application.job_id)

    # Các hồ sơ được dời phải thuộc cùng một công việc
    if len(job_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể dời lịch chung cho các hồ sơ thuộc nhiều công việc khác nhau.",
        )

    # Đánh dấu lịch cũ của các ứng viên được chọn là rescheduled
    for link in old_links:
        link.status = "rescheduled"

    # Tạo buổi phỏng vấn mới
    new_session = InterviewSession(
        title=data.title,
        start_time=data.start_time,
        end_time=data.end_time,
        interview_type=data.interview_type,
        location=data.location,
        meeting_url=data.meeting_url,
        notes=data.notes,
        created_by=current_user.id,
    )

    db.add(new_session)
    db.flush()

    # Liên kết các hồ sơ vào lịch mới
    for application in applications:
        db.add(
            InterviewSessionApplication(
                session_id=new_session.id,
                application_id=application.id,
            )
        )

    # Nếu tất cả ứng viên trong lịch cũ đã được dời,
    # cập nhật trạng thái chung của lịch cũ
    all_old_links = db.scalars(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id
        )
    ).all()

    if all(
        link.status == "rescheduled"
        for link in all_old_links
    ):
        old_session.status = "rescheduled"

    db.commit()
    db.refresh(new_session)


    # Lấy thông tin ứng viên thuộc lịch mới
    linked_applications = db.execute(
        select(Application, User, InterviewSessionApplication)
        .join(
            InterviewSessionApplication,
            InterviewSessionApplication.application_id == Application.id,
        )
        .join(User, User.id == Application.user_id)
        .where(
            InterviewSessionApplication.session_id == new_session.id
        )
    ).all()

    candidates = [
        InterviewCandidateSummary(
            application_id=application.id,
            full_name=candidate.full_name,
            email=candidate.email,
            status=session_application.status,
        )
        for application, candidate, session_application in linked_applications
    ]

    return InterviewSessionResponse(
        id=new_session.id,
        title=new_session.title,
        start_time=new_session.start_time,
        end_time=new_session.end_time,
        interview_type=new_session.interview_type,
        location=new_session.location,
        meeting_url=new_session.meeting_url,
        notes=new_session.notes,
        status=new_session.status,
        created_by=new_session.created_by,
        created_at=new_session.created_at,
        candidates=candidates,
    )


@router.post( "/reschedule", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED,)
def reschedule_multiple_applications( data: InterviewSessionCreate, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được dời lịch
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền dời lịch phỏng vấn.",
        )

    # Lấy các hồ sơ được chọn
    applications = db.scalars(
        select(Application).where(
            Application.id.in_(data.application_ids),
            Application.status == "interview",
            Application.hidden_by_candidate.is_(False),
        )
    ).all()

    if len(applications) != len(data.application_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một hoặc nhiều hồ sơ không hợp lệ hoặc không còn ở trạng thái phỏng vấn.",
        )

    # Kiểm tra quyền quản lý và các hồ sơ phải cùng công việc
    job_ids = set()

    for application in applications:
        job = db.get(Job, application.job_id)

        if not job or job.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền dời lịch cho một hoặc nhiều hồ sơ đã chọn.",
            )

        job_ids.add(application.job_id)

    if len(job_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể dời lịch chung cho các hồ sơ thuộc nhiều công việc khác nhau.",
        )
    # Tìm lịch cũ có thể thay thế của từng ứng viên
    old_links = db.scalars(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.application_id.in_(data.application_ids),
            InterviewSessionApplication.status.in_(["scheduled", "cancelled"]),
        )
    ).all()

    if len(old_links) != len(data.application_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một hoặc nhiều ứng viên không có lịch cũ có thể thay thế.",
        )

    # Kiểm tra quyền sở hữu và trạng thái các lịch cũ
    old_session_ids = {link.session_id for link in old_links}

    old_sessions = db.scalars(
        select(InterviewSession).where(
            InterviewSession.id.in_(old_session_ids)
        )
    ).all()

    old_sessions_by_id = {
        session.id: session for session in old_sessions
    }

    for link in old_links:
        old_session = old_sessions_by_id.get(link.session_id)

        if not old_session or old_session.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền dời một hoặc nhiều lịch đã chọn.",
            )

        if old_session.status not in ["scheduled", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Một hoặc nhiều buổi phỏng vấn không thể tiếp tục dời lịch.",
            )

    # Đánh dấu lịch cũ của các ứng viên được chọn
    for link in old_links:
        link.status = "rescheduled"

    # Cập nhật trạng thái các buổi cũ nếu tất cả ứng viên đã được dời
    for old_session in old_sessions:
        all_links = db.scalars(
            select(InterviewSessionApplication).where(
                InterviewSessionApplication.session_id == old_session.id
            )
        ).all()

        if all(link.status == "rescheduled" for link in all_links):
            old_session.status = "rescheduled"

    # Tạo duy nhất một buổi phỏng vấn mới
    new_session = InterviewSession(
        title=data.title,
        start_time=data.start_time,
        end_time=data.end_time,
        interview_type=data.interview_type,
        location=data.location,
        meeting_url=data.meeting_url,
        notes=data.notes,
        created_by=current_user.id,
    )

    db.add(new_session)
    db.flush()

    for application in applications:
        db.add(
            InterviewSessionApplication(
                session_id=new_session.id,
                application_id=application.id,
                status="scheduled",
            )
        )

    db.commit()
    db.refresh(new_session)

    # Lấy danh sách ứng viên của buổi mới
    linked_applications = db.execute(
        select(Application, User, InterviewSessionApplication)
        .join(
            InterviewSessionApplication,
            InterviewSessionApplication.application_id == Application.id,
        )
        .join(User, User.id == Application.user_id)
        .where(
            InterviewSessionApplication.session_id == new_session.id
        )
    ).all()

    candidates = [
        InterviewCandidateSummary(
            application_id=application.id,
            full_name=candidate.full_name,
            email=candidate.email,
            status=session_application.status,
        )
        for application, candidate, session_application in linked_applications
    ]

    return InterviewSessionResponse(
        id=new_session.id,
        title=new_session.title,
        start_time=new_session.start_time,
        end_time=new_session.end_time,
        interview_type=new_session.interview_type,
        location=new_session.location,
        meeting_url=new_session.meeting_url,
        notes=new_session.notes,
        status=new_session.status,
        created_by=new_session.created_by,
        created_at=new_session.created_at,
        candidates=candidates,
    )


@router.patch("/{session_id}/complete")
def complete_interview_session( session_id: int, data: InterviewSessionComplete, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được kết thúc phỏng vấn
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền kết thúc phỏng vấn.",
        )

    interview_session = db.get(InterviewSession, session_id)

    if not interview_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch phỏng vấn.",
        )

    if interview_session.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền kết thúc buổi phỏng vấn này.",
        )

    if interview_session.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể kết thúc buổi phỏng vấn đang scheduled.",
        )

    # Lấy danh sách ứng viên vẫn đang có lịch
    session_applications = db.scalars(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id,
            InterviewSessionApplication.status == "scheduled",
        )
    ).all()

    if not session_applications:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buổi phỏng vấn không còn ứng viên đang tham gia.",
        )

    # Kiểm tra nhà tuyển dụng đã đánh giá đầy đủ ứng viên chưa
    evaluation_map = {
        item.application_id: item.result
        for item in data.evaluations
    }

    scheduled_ids = {
        item.application_id for item in session_applications
    }

    if set(evaluation_map.keys()) != scheduled_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phải đánh giá đầy đủ tất cả ứng viên đang tham gia buổi phỏng vấn.",
        )

    # Cập nhật trạng thái lịch và hồ sơ
    for session_application in session_applications:
        application = db.get(
            Application,
            session_application.application_id,
        )
        if not application or application.status != "interview":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Có hồ sơ không còn ở trạng thái phỏng vấn.",
            )

        job = db.get(Job, application.job_id)

        if not job or job.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền đánh giá hồ sơ này.",
            )
        session_application.status = "completed"

        result = evaluation_map[application.id]

        if result == "accepted":
            application.status = "accepted"

        elif result == "rejected":
            application.status = "rejected"

        # next_round: giữ nguyên interview

    # Hoàn tất toàn bộ buổi phỏng vấn
    interview_session.status = "completed"

    db.commit()
    db.refresh(interview_session)

    return {
        "message": "Đã hoàn tất buổi phỏng vấn và cập nhật kết quả đánh giá.",
        "id": interview_session.id,
        "status": interview_session.status,
    }



@router.patch( "/{session_id}/applications/{application_id}/complete")
def complete_candidate_interview( session_id: int, application_id: int, data: InterviewCandidateComplete, db: DbDep, current_user: UserDep,):
    # Chỉ recruiter được kết thúc phỏng vấn
    if current_user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có quyền kết thúc phỏng vấn.",
        )

    interview_session = db.get(InterviewSession, session_id)

    if not interview_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch phỏng vấn.",
        )

    if interview_session.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền kết thúc buổi phỏng vấn này.",
        )

    if interview_session.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buổi phỏng vấn không còn ở trạng thái scheduled.",
        )

    # Tìm ứng viên trong buổi phỏng vấn
    session_application = db.scalar(
        select(InterviewSessionApplication).where(
            InterviewSessionApplication.session_id == session_id,
            InterviewSessionApplication.application_id == application_id,
        )
    )

    if not session_application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ không thuộc buổi phỏng vấn này.",
        )

    if session_application.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lịch của ứng viên không còn ở trạng thái scheduled.",
        )

    application = db.get(Application, application_id)
    if not application or application.status != "interview":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hồ sơ không còn ở trạng thái phỏng vấn.",
        )

    job = db.get(Job, application.job_id)

    if not job or job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền đánh giá hồ sơ này.",
        )

    # Cập nhật kết quả đánh giá
    session_application.status = "completed"

    # Đẩy thay đổi xuống database trước khi đếm ứng viên
    db.flush()

    if data.result == "accepted":
        application.status = "accepted"

    elif data.result == "rejected":
        application.status = "rejected"

    # next_round: giữ nguyên interview

    # Kiểm tra còn ứng viên đang phỏng vấn không
    remaining_candidates = db.scalar(
        select(func.count()).select_from(
            InterviewSessionApplication
        ).where(
            InterviewSessionApplication.session_id == session_id,
            InterviewSessionApplication.status == "scheduled",
        )
    ) or 0

    if remaining_candidates == 0:
        interview_session.status = "completed"

    db.commit()
    db.refresh(interview_session)

    return {
        "message": "Đã hoàn tất phỏng vấn và cập nhật kết quả ứng viên.",
        "session_id": session_id,
        "application_id": application_id,
        "application_status": application.status,
        "interview_status": session_application.status,
        "session_status": interview_session.status,
    }
