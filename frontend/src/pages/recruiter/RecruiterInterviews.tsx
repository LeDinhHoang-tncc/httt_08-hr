import { useEffect, useState } from "react";

import { getManagedJobs } from "../../services/jobService";
import { getReceivedApplications, type ReceivedApplication, } from "../../services/applicationService";
import {
  getMyInterviewSessions,
  createInterviewSession,
  cancelInterviewSession,
  cancelCandidateInterview,
  completeCandidateInterview,
  completeInterviewSession,
} from "../../services/interviewService";
import type { Job } from "../../types/job";
import type { InterviewSession, InterviewStatus, InterviewType, InterviewSessionCreate, } from "../../types/interview";
import type { InterviewResult } from "../../types/interview";

import "./RecruiterInterviews.css";

function getInterviewStatusLabel(status: InterviewStatus): string {
  const labels: Record<InterviewStatus, string> = {
    scheduled: "Đã lên lịch",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
    rescheduled: "Đã dời lịch",
  };

  return labels[status];
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Lấy toàn bộ hồ sơ ứng tuyển theo phân trang
async function getAllApplications(): Promise<ReceivedApplication[]> {
  const firstPage = await getReceivedApplications({
    page: 1,
    pageSize: 100,
  });

  const totalPages = Math.ceil(
    firstPage.total / firstPage.page_size
  );

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      getReceivedApplications({
        page: index + 2,
        pageSize: 100,
      })
    )
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((page) => page.items),
  ];
}

// Lấy toàn bộ lịch phỏng vấn theo phân trang
async function getAllInterviewSessions(): Promise<InterviewSession[]> {
  const firstPage = await getMyInterviewSessions({
    page: 1,
    pageSize: 100,
  });

  const totalPages = Math.ceil(
    firstPage.total / firstPage.page_size
  );

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      getMyInterviewSessions({
        page: index + 2,
        pageSize: 100,
      })
    )
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((page) => page.items),
  ];
}

function RecruiterInterviews() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<ReceivedApplication[]>([]);
    const [sessions, setSessions] = useState<InterviewSession[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
    // Các ứng viên được chọn để tạo lịch phỏng vấn
    const [selectedApplicationIds, setSelectedApplicationIds] = useState<number[]>([]);
    // Hiển thị form tạo lịch
    const [showCreateForm, setShowCreateForm] = useState(false);
    // Trạng thái gửi yêu cầu tạo lịch
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [interviewForm, setInterviewForm] = useState({
      title: "",
      start_time: "",
      end_time: "",
      interview_type: "online" as InterviewType,
      location: "",
      meeting_url: "",
      notes: "",
    });

    const [evaluating, setEvaluating] = useState(false);

    const [evaluationResults, setEvaluationResults] = useState<
      Record<number, InterviewResult>
    >({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [jobData, applicationData, sessionData] =
          await Promise.all([
            getManagedJobs(),
            getAllApplications(),
            getAllInterviewSessions(),
          ]);

        setJobs(jobData);
        setApplications(applicationData);
        setSessions(sessionData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu lịch phỏng vấn."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Lấy các hồ sơ thuộc một công việc
  const getJobApplications = (jobId: number) => {
    return applications.filter(
      (application) => application.job_id === jobId
    );
  };

  // Lấy các buổi phỏng vấn thuộc một công việc
  const getJobSessions = (jobId: number) => {
    const jobApplicationIds = new Set(
      getJobApplications(jobId).map((application) => application.id)
    );

    return sessions
      .filter((session) =>
        session.candidates.some((candidate) =>
          jobApplicationIds.has(candidate.application_id)
        )
      )
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() -
          new Date(a.start_time).getTime()
      );
  };

  // Tìm lịch đang có hiệu lực của một ứng viên
    const getActiveSession = (applicationId: number) => {
        return sessions.find(
        (session) =>
            session.status === "scheduled" &&
            session.candidates.some(
            (candidate) =>
                candidate.application_id === applicationId &&
                candidate.status === "scheduled"
            )
        );
    };

    const handleToggleApplication = (applicationId: number) => {
        setSelectedApplicationIds((previous) =>
            previous.includes(applicationId)
            ? previous.filter((id) => id !== applicationId)
            : [...previous, applicationId]
        );
    };

  // Lấy lịch sử phỏng vấn của riêng một ứng viên
    const getCandidateInterviewHistory = (applicationId: number) => {
        return sessions.filter((session) =>
        session.candidates.some(
            (candidate) => candidate.application_id === applicationId
        ))
        .sort(
        (a, b) =>
            new Date(b.start_time).getTime() -
            new Date(a.start_time).getTime()
        );
    };
  
    const handleCancelCandidateInterview = async (
      sessionId: number,
      applicationId: number
    ) => {
      if (!window.confirm("Bạn có chắc muốn hủy lịch phỏng vấn của ứng viên này không?")) {
        return;
      }

      try {
        await cancelCandidateInterview(sessionId, applicationId);

        const updatedSessions = await getAllInterviewSessions();
        setSessions(updatedSessions);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Không thể hủy lịch phỏng vấn.");
      }
    };

    const handleCancelInterviewSession = async (sessionId: number) => {
      if (!window.confirm("Bạn có chắc muốn hủy toàn bộ lịch phỏng vấn này không?")) {
        return;
      }

      try {
        await cancelInterviewSession(sessionId);

        const updatedSessions = await getAllInterviewSessions();
        setSessions(updatedSessions);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Không thể hủy lịch phỏng vấn.");
      }
    };

    // Đánh giá một ứng viên
    const handleCompleteCandidate = async (
      sessionId: number,
      applicationId: number
    ) => {
      const result = evaluationResults[applicationId];

      if (!result) {
        alert("Vui lòng chọn kết quả đánh giá.");
        return;
      }

      try {
        setEvaluating(true);

        await completeCandidateInterview(
          sessionId,
          applicationId,
          result
        );

        const [updatedSessions, updatedApplications] = await Promise.all([
          getAllInterviewSessions(),
          getAllApplications(),
        ]);

        setSessions(updatedSessions);
        setApplications(updatedApplications);

        setEvaluationResults((previous) => {
          const updated = { ...previous };
          delete updated[applicationId];
          return updated;
        });

        alert("Đã đánh giá ứng viên thành công.");
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Không thể đánh giá ứng viên."
        );
      } finally {
        setEvaluating(false);
      }
    };

    // Đánh giá toàn bộ ứng viên còn lịch trong một buổi
    const handleCompleteSession = async (session: InterviewSession) => {
      const scheduledCandidates = session.candidates.filter(
        (candidate) => candidate.status === "scheduled"
      );

      if (scheduledCandidates.length === 0) {
        alert("Không còn ứng viên nào cần đánh giá.");
        return;
      }

      const missingResult = scheduledCandidates.some(
        (candidate) => !evaluationResults[candidate.application_id]
      );

      if (missingResult) {
        alert("Vui lòng chọn kết quả cho tất cả ứng viên còn lịch.");
        return;
      }

      if (!window.confirm("Bạn có chắc muốn hoàn thành và đánh giá toàn bộ buổi phỏng vấn này?")) {
        return;
      }

      try {
        setEvaluating(true);

        await completeInterviewSession(
          session.id,
          scheduledCandidates.map((candidate) => ({
            application_id: candidate.application_id,
            result: evaluationResults[candidate.application_id],
          }))
        );

        const [updatedSessions, updatedApplications] = await Promise.all([
          getAllInterviewSessions(),
          getAllApplications(),
        ]);

        setSessions(updatedSessions);
        setApplications(updatedApplications);

        setEvaluationResults((previous) => {
          const updated = { ...previous };

          scheduledCandidates.forEach((candidate) => {
            delete updated[candidate.application_id];
          });

          return updated;
        });

        alert("Đã hoàn thành buổi phỏng vấn.");
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Không thể hoàn thành buổi phỏng vấn."
        );
      } finally {
        setEvaluating(false);
      }
    };

    const handleCreateInterview = async () => {
      setCreateError("");

      if (selectedApplicationIds.length === 0) {
        setCreateError("Vui lòng chọn ít nhất một ứng viên.");
        return;
      }

      if (!interviewForm.title.trim()) {
        setCreateError("Vui lòng nhập tiêu đề buổi phỏng vấn.");
        return;
      }

      if (!interviewForm.start_time || !interviewForm.end_time) {
        setCreateError("Vui lòng chọn thời gian bắt đầu và kết thúc.");
        return;
      }

      const startDate = new Date(interviewForm.start_time);
      const endDate = new Date(interviewForm.end_time);

      console.log("Thời gian bắt đầu:", interviewForm.start_time);
      console.log("Thời gian kết thúc:", interviewForm.end_time);
      console.log("Start Date:", startDate);
      console.log("End Date:", endDate);
      console.log("So sánh:", endDate.getTime() - startDate.getTime());

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        setCreateError("Thời gian không hợp lệ.");
        return;
      }

      if (endDate <= startDate) {
        setCreateError("Thời gian kết thúc phải sau thời gian bắt đầu.");
        return;
      }

      if (
        interviewForm.interview_type === "online" &&
        !interviewForm.meeting_url.trim()
      ) {
        setCreateError("Vui lòng nhập link phỏng vấn.");
        return;
      }

      if (
        interviewForm.interview_type === "offline" &&
        !interviewForm.location.trim()
      ) {
        setCreateError("Vui lòng nhập địa điểm phỏng vấn.");
        return;
      }

      const data: InterviewSessionCreate = {
        title: interviewForm.title.trim(),
        application_ids: selectedApplicationIds,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        interview_type: interviewForm.interview_type,
        location:
          interviewForm.interview_type === "offline"
            ? interviewForm.location.trim()
            : null,
        meeting_url:
          interviewForm.interview_type === "online"
            ? interviewForm.meeting_url.trim()
            : null,
        notes: interviewForm.notes.trim() || null,
      };

      try {
        setCreating(true);

        // Tạo mới hoặc dời lịch cho tất cả ứng viên trong cùng một buổi
        await createInterviewSession(data);

        const updatedSessions = await getAllInterviewSessions();
        setSessions(updatedSessions);

        setSelectedApplicationIds([]);
        setShowCreateForm(false);

        setInterviewForm({
          title: "",
          start_time: "",
          end_time: "",
          interview_type: "online",
          location: "",
          meeting_url: "",
          notes: "",
        });
      } catch (err) {
        setCreateError(
          err instanceof Error
            ? err.message
            : "Không thể tạo hoặc thay thế lịch phỏng vấn."
        );

        const updatedSessions = await getAllInterviewSessions().catch(() => null);

        if (updatedSessions) {
          setSessions(updatedSessions);
        }
      } finally {
        setCreating(false);
      }
    };

  const visibleJobs = jobs
    .map((job) => {
      const interviewApplications = getJobApplications(job.id).filter(
        (application) => application.status === "interview"
      );

      const jobSessions = getJobSessions(job.id);

      const scheduledCount = interviewApplications.filter(
        (application) => getActiveSession(application.id) !== undefined
      ).length;

      return {
        job,
        interviewApplications,
        jobSessions,
        scheduledCount,
        unscheduledCount:
          interviewApplications.length - scheduledCount,
      };
    })
    .filter(
      (item) =>
        item.interviewApplications.length > 0 ||
        item.jobSessions.length > 0
    );

  const selectedApplications = selectedJob
    ? getJobApplications(selectedJob.id).filter(
        (application) => application.status === "interview"
      )
    : [];


  return (
    <main className="recruiter-interviews">
      <header className="interviews-header">
        <h1>Quản lý lịch phỏng vấn</h1>
        <p>Quản lý ứng viên và lịch phỏng vấn theo từng công việc.</p>
      </header>

      {loading && <p>Đang tải dữ liệu...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && visibleJobs.length === 0 && (
        <p>Chưa có công việc nào có ứng viên trong quy trình phỏng vấn.</p>
      )}

      {!loading && !error && visibleJobs.length > 0 && (
        <section className="interview-job-list">
          {visibleJobs.map((item) => (
            <article
              className="interview-job-item"
              key={item.job.id}
            >
              <h2>{item.job.title}</h2>

              <p>{item.job.company_name}</p>

              <div className="interview-job-summary">
                <p>
                  Tổng ứng viên đang phỏng vấn:{" "}
                  {item.interviewApplications.length}
                </p>

                <p>
                  Đã có lịch: {item.scheduledCount}
                </p>

                <p>
                  Chưa lên lịch: {item.unscheduledCount}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJob(item.job)}
              >
                Xem chi tiết
              </button>
            </article>
          ))}
        </section>
      )}

      {selectedJob && (
        <div
          className="interview-modal-overlay"
          onClick={() => setSelectedJob(null)}
        >
          <section
            className="interview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="interview-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="interview-modal-header">
              <div>
                <h2 id="interview-modal-title">
                  {selectedJob.title}
                </h2>
                <p>{selectedJob.company_name}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJob(null)}
              >
                Đóng
              </button>
            </header>

            {showCreateForm && (
              <section className="interview-create-form">
                <h3>Tạo lịch phỏng vấn</h3>

                <p>
                  Số ứng viên được chọn: {selectedApplicationIds.length}
                </p>

                <div>
                  <label>Tiêu đề buổi phỏng vấn</label>
                  <input
                    type="text"
                    value={interviewForm.title}
                    onChange={(event) =>
                      setInterviewForm({
                        ...interviewForm,
                        title: event.target.value,
                      })
                    }
                    placeholder="Ví dụ: Phỏng vấn Backend Developer"
                  />
                </div>

                <div>
                  <label>Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={interviewForm.start_time}
                    onChange={(event) =>
                      setInterviewForm({
                        ...interviewForm,
                        start_time: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    value={interviewForm.end_time}
                    onChange={(event) =>
                      setInterviewForm({
                        ...interviewForm,
                        end_time: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Hình thức phỏng vấn</label>
                  <select
                    value={interviewForm.interview_type}
                    onChange={(event) =>
                      setInterviewForm({
                        ...interviewForm,
                        interview_type: event.target.value as InterviewType,
                      })
                    }
                  >
                    <option value="online">Trực tuyến</option>
                    <option value="offline">Trực tiếp</option>
                  </select>
                </div>

                {interviewForm.interview_type === "online" ? (
                  <div>
                    <label>Link tham gia phỏng vấn</label>
                    <input
                      type="url"
                      value={interviewForm.meeting_url}
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          meeting_url: event.target.value,
                        })
                      }
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                ) : (
                  <div>
                    <label>Địa điểm phỏng vấn</label>
                    <input
                      type="text"
                      value={interviewForm.location}
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          location: event.target.value,
                        })
                      }
                      placeholder="Nhập địa chỉ phỏng vấn"
                    />
                  </div>
                )}

                <div>
                  <label>Ghi chú</label>
                  <textarea
                    value={interviewForm.notes}
                    onChange={(event) =>
                      setInterviewForm({
                        ...interviewForm,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Thông tin cần lưu ý cho ứng viên..."
                  />
                </div>

                {createError && (
                  <p className="error-message">{createError}</p>
                )}

                <div className="interview-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Đóng form
                  </button>

                  <button type="button" onClick={handleCreateInterview} disabled={creating}>
                    {creating ? "Đang tạo lịch..." : "Xác nhận tạo lịch"}
                  </button>
                </div>

              </section>
            )}

            <section className="interview-session-management">
              <h3>Buổi phỏng vấn đang có hiệu lực</h3>

              {getJobSessions(selectedJob.id).filter(
                (session) => session.status === "scheduled"
              ).length === 0 ? (
                <p>Hiện không có buổi phỏng vấn nào đang có hiệu lực.</p>
              ) : (
                getJobSessions(selectedJob.id)
                  .filter((session) => session.status === "scheduled")
                  .map((session) => (
                    <article
                      className="interview-session-item"
                      key={session.id}
                    >
                      <div>
                        <h4>{session.title}</h4>
                        <p>
                          {formatDateTime(session.start_time)}
                          {" – "}
                          {formatDateTime(session.end_time)}
                        </p>
                      </div>

                      <details>
                        <summary>Xem chi tiết</summary>

                        <div>
                          <p>
                            Hình thức:{" "}
                            {session.interview_type === "online"
                              ? "Trực tuyến"
                              : "Trực tiếp"}
                          </p>

                          {session.location && (
                            <p>Địa điểm: {session.location}</p>
                          )}

                          {session.meeting_url && (
                            <p>
                              Link:{" "}
                              <a
                                href={session.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Tham gia cuộc họp
                              </a>
                            </p>
                          )}

                          <p>Ứng viên tham gia:</p>
    
                          {session.candidates.map((candidate) => (
                            <div key={candidate.application_id}>
                              <p>
                                {candidate.full_name} ({candidate.email})
                              </p>

                              {candidate.status === "scheduled" && (
                                <div>
                                  <label>Kết quả đánh giá:</label>

                                  <select
                                    value={evaluationResults[candidate.application_id] ?? ""}
                                    onChange={(event) =>
                                      setEvaluationResults((previous) => ({
                                        ...previous,
                                        [candidate.application_id]: event.target.value as InterviewResult,
                                      }))
                                    }
                                  >
                                    <option value="">-- Chọn kết quả --</option>
                                    <option value="accepted">Đạt</option>
                                    <option value="rejected">Không đạt</option>
                                    <option value="next_round">Qua vòng tiếp theo</option>
                                  </select>

                                  <button
                                    type="button"
                                    disabled={evaluating}
                                    onClick={() =>
                                      handleCompleteCandidate(session.id, candidate.application_id)
                                    }
                                  >
                                    Đánh giá ứng viên
                                  </button>
                                </div>
                              )}

                              {candidate.status !== "scheduled" && (
                                <p>Trạng thái: {getInterviewStatusLabel(candidate.status)}</p>
                              )}
                            </div>
                          ))}

                          {session.candidates.some(
                            (candidate) => candidate.status === "scheduled"
                          ) && (
                            <button
                              type="button"
                              disabled={evaluating}
                              onClick={() => handleCompleteSession(session)}
                            >
                              {evaluating
                                ? "Đang xử lý..."
                                : "Hoàn thành và đánh giá toàn bộ buổi phỏng vấn"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleCancelInterviewSession(session.id)
                            }
                          >
                            Hủy toàn bộ buổi phỏng vấn
                          </button>
                        </div>
                      </details>
                    </article>
                  ))
              )}
            </section>

            <section className="interview-modal-candidates">
                <h3>
                Ứng viên đang trong quy trình phỏng vấn (
                {selectedApplications.length})
                </h3>

                {selectedApplicationIds.length > 0 && (
                <button type="button" onClick={() => { setCreateError(""); setShowCreateForm(true);}}>
                    Tạo lịch phỏng vấn
                </button>
                )}

              {selectedApplications.length === 0 && (
                <p>Hiện không có ứng viên nào đang ở trạng thái phỏng vấn.</p>
              )}

                {selectedApplications.map((application) => {
                    const activeSession = getActiveSession(application.id);
                    const history = getCandidateInterviewHistory(application.id);
                    const isHistoryExpanded = expandedHistory === application.id;

                    return (
                        <article className="interview-candidate-item" key={application.id}>

                        <div className="interview-candidate-info">
                            <h4>{application.candidate.full_name}</h4>
                            <p>{application.candidate.email}</p>
                        </div>
                
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedApplicationIds.includes(application.id)}
                            onChange={() => handleToggleApplication(application.id)}
                          />
                          {activeSession
                            ? "Chọn để thay thế lịch hiện tại"
                            : "Chọn để tạo lịch phỏng vấn"}
                        </label>
                
                        {activeSession ? (
                          <div className="candidate-current-interview">
                            <span className="candidate-interview-status candidate-interview-status--scheduled">
                              Đã có lịch phỏng vấn
                            </span>

                            <p>{activeSession.title}</p>

                            <p>
                              {formatDateTime(activeSession.start_time)}
                              {" – "}
                              {formatDateTime(activeSession.end_time)}
                            </p>

                            <p>
                              Hình thức:{" "}
                              {activeSession.interview_type === "online"
                                ? "Trực tuyến"
                                : "Trực tiếp"}
                            </p>

                            {activeSession.location && (
                              <p>Địa điểm: {activeSession.location}</p>
                            )}

                            {activeSession.meeting_url && (
                              <p>
                                Link:{" "}
                                <a
                                  href={activeSession.meeting_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Tham gia cuộc họp
                                </a>
                              </p>
                            )}

                            <div className="interview-cancel-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelCandidateInterview(
                                    activeSession.id,
                                    application.id
                                  )
                                }
                              >
                                Hủy lịch ứng viên này
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="candidate-interview-status candidate-interview-status--not-scheduled">
                            Chưa lên lịch phỏng vấn
                          </span>
                        )}
                        <button
                            type="button"
                            onClick={() =>
                            setExpandedHistory(
                                isHistoryExpanded ? null : application.id
                            )
                            }
                        >
                            {isHistoryExpanded ? "Ẩn lịch sử" : "Xem lịch sử"}
                            {" ("}
                            {history.length}
                            {")"}
                        </button>

                        {isHistoryExpanded && (
                            <div className="candidate-interview-history">
                            <h5>Lịch sử phỏng vấn</h5>

                            {history.length === 0 ? (
                                <p>Ứng viên chưa có lịch sử phỏng vấn.</p>
                            ) : (
                                history.map((session) => {
                                const candidateSession = session.candidates.find(
                                    (candidate) =>
                                    candidate.application_id === application.id
                                );

                                return (
                                    <article
                                    className="interview-history-item"
                                    key={session.id}
                                    >
                                    <h6>{session.title}</h6>

                                    <p>
                                        Thời gian: {formatDateTime(session.start_time)}
                                        {" – "}
                                        {formatDateTime(session.end_time)}
                                    </p>

                                    <p>
                                        Hình thức:{" "}
                                        {session.interview_type === "online"
                                        ? "Trực tuyến"
                                        : "Trực tiếp"}
                                    </p>

                                    {session.location && (
                                        <p>Địa điểm: {session.location}</p>
                                    )}

                                    {session.meeting_url && (
                                        <p>
                                        Link:{" "}
                                        <a
                                            href={session.meeting_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Tham gia cuộc họp
                                        </a>
                                        </p>
                                    )}

                                    <p>
                                        Trạng thái:{" "}
                                        {candidateSession
                                        ? getInterviewStatusLabel(candidateSession.status)
                                        : "Không xác định"}
                                    </p>

                                    {session.notes && (
                                        <p>Ghi chú: {session.notes}</p>
                                    )}
                                    </article>
                                );
                                })
                            )}
                            </div>
                        )}
                        </article>
                    );
                })}

            </section>
          </section>
        </div>
      )}
    </main>
  );
}

export default RecruiterInterviews;