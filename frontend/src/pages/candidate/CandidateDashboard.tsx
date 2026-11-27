import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMyApplications,
  getJobById,
  hideApplication,
  type Application,
} from "../../services/applicationService";
import type { Job } from "../../types/job";
import {
  getCandidateInterviewSessions,
} from "../../services/interviewService";
import type { CandidateInterviewSession } from "../../types/interview";

import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import "./CandidateDashboard.css";

function getStatusLabel(status: Application["status"]): string {
  const statusLabels: Record<Application["status"], string> = {
    submitted: "Đã nộp",
    reviewing: "Đang xem xét",
    interview: "Phỏng vấn",
    accepted: "Được chấp nhận",
    rejected: "Bị từ chối",
    withdrawn: "Đã rút đơn",
  };

  return statusLabels[status] || status;
}

function getInterviewStatusLabel(status: CandidateInterviewSession["status"]) {
  const labels = {
    scheduled: "Đã lên lịch",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
    rescheduled: "Đã dời lịch",
  };

  return labels[status] || status;
}

function formatInterviewDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function CandidateDashboard() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Record<number, Job | null>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Đơn đang chờ người dùng xác nhận xóa trong hộp thoại
  const [applicationToDelete, setApplicationToDelete] =
    useState<Application | null>(null);
    const [actionError, setActionError] = useState("");

    const handleDeleteApplication = async (application: Application) => {
    try {
      setDeletingId(application.id);
      setActionError("");

      await hideApplication(application.id);

      setApplications((previous) =>
        previous.filter((item) => item.id !== application.id)
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Không thể xóa đơn ứng tuyển."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!applicationToDelete) return;

    const target = applicationToDelete;
    setApplicationToDelete(null);

    await handleDeleteApplication(target);
  };

  const [interviewSessions, setInterviewSessions] = useState<CandidateInterviewSession[]>([]);
  const [interviewLoading, setInterviewLoading] = useState(true);
  const [interviewError, setInterviewError] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyApplications();
        setApplications(data.items);

        const jobEntries = await Promise.all(
          data.items.map(async (application) => {
            try {
              const job = await getJobById(application.job_id);
              return [application.job_id, job] as const;
            } catch {
              return [application.job_id, null] as const;
            }
          })
        );

        setJobs(Object.fromEntries(jobEntries));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi tải dữ liệu."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    const fetchInterviewSessions = async () => {
      try {
        setInterviewLoading(true);
        setInterviewError("");

        const data = await getCandidateInterviewSessions();
        setInterviewSessions(data.items);
      } catch (err) {
        setInterviewError(
          err instanceof Error
            ? err.message
            : "Không thể tải lịch phỏng vấn."
        );
      } finally {
        setInterviewLoading(false);
      }
    };

    fetchInterviewSessions();
  }, []);

  return (
    <main className="candidate-dashboard">
      <section className="candidate-info">
        <h1>Trang ứng viên</h1>
        <p>Xin chào, {user?.full_name}!</p>
        <p>Email: {user?.email}</p>
      </section>

      <section className="candidate-applications">
        <h2>Đơn ứng tuyển của tôi</h2>

        {loading && <p>Đang tải danh sách đơn ứng tuyển...</p>}

        {error && <p className="error-message">{error}</p>}

        {actionError && <p className="error-message">{actionError}</p>}

        {!loading && !error && applications.length === 0 && (
          <p>Bạn chưa có đơn ứng tuyển nào.</p>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="application-list">
            {applications.map((application) => (
              <article className="application-item" key={application.id}>
                <h3>Đơn ứng tuyển #{application.id}</h3>

                {jobs[application.job_id] ? (
                  <>
                    <h4>{jobs[application.job_id]?.title}</h4>
                    <p>
                      Công ty: {jobs[application.job_id]?.company_name}
                    </p>
                  </>
                ) : (
                  <p>Không thể tải thông tin công việc.</p>
                )}

                <p>Trạng thái: {getStatusLabel(application.status)}</p>

                <p>
                  Ngày ứng tuyển:{" "}
                  {new Date(application.created_at).toLocaleDateString("vi-VN")}
                </p>

                <p>
                  CV: {application.original_filename || "Chưa có thông tin"}
                </p>
                <Link to={`/candidate/applications/${application.id}`}>
                    Xem chi tiết đơn
                </Link>
                {["accepted", "rejected", "withdrawn"].includes(application.status) && (
                  <button
                    type="button"
                    onClick={() => setApplicationToDelete(application)}
                    disabled={deletingId === application.id}
                  >
                    {deletingId === application.id ? "Đang xóa..." : "Xóa đơn"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="candidate-interviews">
        <h2>Lịch phỏng vấn của tôi</h2>

        {interviewLoading && <p>Đang tải lịch phỏng vấn...</p>}

        {interviewError && (
          <p className="error-message">{interviewError}</p>
        )}

        {!interviewLoading && !interviewError && (
          <>
            {applications.filter((item) => item.status === "interview").length === 0 ? (
              <p>Bạn chưa có hồ sơ nào ở trạng thái phỏng vấn.</p>
            ) : (
              applications
                .filter((item) => item.status === "interview")
                .map((application) => {
                  const applicationSessions = interviewSessions
                    .filter(
                      (session) => session.application_id === application.id
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.start_time).getTime() -
                        new Date(a.start_time).getTime()
                    );

                  const activeSession = applicationSessions.find(
                    (session) => session.status === "scheduled"
                  );

                  const historySessions = applicationSessions.filter(
                    (session) => session.status !== "scheduled"
                  );

                  const isHistoryExpanded =
                    expandedHistory === application.id;

                  return (
                    <article
                      className="candidate-interview-item"
                      key={application.id}
                    >
                      <h3>Đơn ứng tuyển #{application.id}</h3>

                      <p>
                        Công việc:{" "}
                        {jobs[application.job_id]?.title || "Không có thông tin"}
                      </p>

                      <p>
                        Công ty:{" "}
                        {jobs[application.job_id]?.company_name ||
                          "Không có thông tin"}
                      </p>

                      {activeSession ? (
                        <div className="candidate-interview-current">
                          <h4>Lịch phỏng vấn hiện tại</h4>

                          <p>Tiêu đề: {activeSession.title}</p>

                          <p>
                            Bắt đầu:{" "}
                            {formatInterviewDateTime(activeSession.start_time)}
                          </p>

                          <p>
                            Kết thúc:{" "}
                            {formatInterviewDateTime(activeSession.end_time)}
                          </p>

                          <p>
                            Hình thức:{" "}
                            {activeSession.interview_type === "online"
                              ? "Trực tuyến"
                              : "Trực tiếp"}
                          </p>

                          {activeSession.interview_type === "online" ? (
                            <p>
                              Link tham gia:{" "}
                              {activeSession.meeting_url ? (
                                <a
                                  href={activeSession.meeting_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Tham gia phỏng vấn
                                </a>
                              ) : (
                                "Chưa có link"
                              )}
                            </p>
                          ) : (
                            <p>
                              Địa điểm: {activeSession.location || "Chưa có thông tin"}
                            </p>
                          )}

                          {activeSession.notes && (
                            <p>Ghi chú: {activeSession.notes}</p>
                          )}
                        </div>
                      ) : (
                        <p>Chưa lên lịch phỏng vấn.</p>
                      )}

                      {historySessions.length > 0 && (
                        <div className="candidate-interview-history">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedHistory(
                                isHistoryExpanded ? null : application.id
                              )
                            }
                          >
                            {isHistoryExpanded
                              ? "Ẩn lịch sử thay đổi"
                              : `Xem lịch sử thay đổi (${historySessions.length})`}
                          </button>

                          {isHistoryExpanded && (
                            <div className="candidate-interview-history-list">
                              {historySessions.map((session) => (
                                <article key={session.id}>
                                  <h4>{session.title}</h4>

                                  <p>
                                    Trạng thái:{" "}
                                    {getInterviewStatusLabel(session.status)}
                                  </p>

                                  <p>
                                    Thời gian:{" "}
                                    {formatInterviewDateTime(session.start_time)}
                                    {" – "}
                                    {formatInterviewDateTime(session.end_time)}
                                  </p>

                                  <p>
                                    Hình thức:{" "}
                                    {session.interview_type === "online"
                                      ? "Trực tuyến"
                                      : "Trực tiếp"}
                                  </p>

                                  {session.interview_type === "online" ? (
                                    session.meeting_url && (
                                      <p>
                                        Link tham gia:{" "}
                                        <a
                                          href={session.meeting_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Xem link
                                        </a>
                                      </p>
                                    )
                                  ) : (
                                    <p>
                                      Địa điểm: {session.location || "Chưa có thông tin"}
                                    </p>
                                  )}

                                  {session.notes && (
                                    <p>Ghi chú: {session.notes}</p>
                                  )}
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={applicationToDelete !== null}
        variant="danger"
        title="Xóa đơn ứng tuyển?"
        message={`Bạn có chắc muốn xóa đơn ứng tuyển #${
          applicationToDelete?.id ?? ""
        }?`}
        confirmText="Xóa đơn"
        onConfirm={handleConfirmDelete}
        onCancel={() => setApplicationToDelete(null)}
      />
    </main>
  );
}

export default CandidateDashboard;