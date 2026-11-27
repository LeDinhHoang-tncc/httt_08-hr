import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getManagedJobs,
  completeJob,
  deleteJob,
} from "../../services/jobService";
import type { Job } from "../../types/job";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import "./RecruiterJobs.css";

function getJobStatusLabel(status: Job["status"]): string {
  const statusLabels: Record<string, string> = {
    draft: "Bản nháp",
    published: "Đang tuyển dụng",
    completed: "Đã kết thúc",
  };

  return statusLabels[status] || status;
}

function RecruiterJobs() {

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [completingId, setCompletingId] = useState<number | null>(null);

  // Hành động đang chờ người dùng xác nhận trong hộp thoại
  const [pendingAction, setPendingAction] = useState<{
    type: "complete" | "delete";
    job: Job;
  } | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getManagedJobs();
        setJobs(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi tải danh sách tin tuyển dụng."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleCompleteJob = async (jobId: number) => {
    try {
      setCompletingId(jobId);
      setActionError("");

      const updatedJob = await completeJob(jobId);

      setJobs((previous) =>
        previous.map((job) =>
          job.id === jobId ? updatedJob : job
        )
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể kết thúc tin tuyển dụng."
      );
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      setActionError("");

      await deleteJob(jobId);

      setJobs((previous) =>
        previous.filter((job) => job.id !== jobId)
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể xóa tin tuyển dụng."
      );
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    const { type, job } = pendingAction;
    setPendingAction(null);

    if (type === "complete") {
      await handleCompleteJob(job.id);
    } else {
      await handleDeleteJob(job.id);
    }
  };

  const isDeleteAction = pendingAction?.type === "delete";
  const pendingTitle = pendingAction?.job.title ?? "";

  return (
    <main className="recruiter-jobs-page">

      <section className="recruiter-jobs">
        <h1>Tin tuyển dụng của tôi</h1>

        {loading && <p>Đang tải danh sách tin tuyển dụng...</p>}

        {error && <p className="error-message">{error}</p>}

        {actionError && (
          <p className="error-message">{actionError}</p>
        )}

        {!loading && !error && jobs.length === 0 && (
          <p>Bạn chưa có tin tuyển dụng nào.</p>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="recruiter-job-list">
            {jobs.map((job) => (
              <article className="recruiter-job-item" key={job.id}>
                <div className="job-item-head">
                  <h3>{job.title}</h3>

                  <span className={`job-status job-status--${job.status}`}>
                    {getJobStatusLabel(job.status)}
                  </span>
                </div>

                <dl className="job-meta">
                  <div>
                    <dt>Công ty</dt>
                    <dd>{job.company_name}</dd>
                  </div>

                  <div>
                    <dt>Địa điểm</dt>
                    <dd>{job.location}</dd>
                  </div>

                  <div>
                    <dt>Ngày tạo</dt>
                    <dd>
                      {new Date(job.created_at).toLocaleDateString("vi-VN")}
                    </dd>
                  </div>
                </dl>

                {job.is_hidden && (
                  <p className="job-hidden-warning">
                    Tin tuyển dụng đang bị Admin ẩn.
                    Tin này hiện không hiển thị công khai trên trang chủ.
                  </p>
                )}

                <div className="job-item-actions">
                  <div className="job-actions-main">
                    <Link
                      to={`/recruiter/jobs/${job.id}/applications`}
                      className="btn-job-primary"
                    >
                      Xem đơn ứng tuyển
                    </Link>

                    <Link
                      to={`/recruiter/jobs/${job.id}/edit`}
                      className="btn-job-secondary"
                    >
                      Chỉnh sửa
                    </Link>
                  </div>

                  <div className="job-actions-danger">
                    {job.status !== "completed" && (
                      <button
                        type="button"
                        className="btn-job-complete"
                        disabled={completingId !== null}
                        onClick={() => setPendingAction({ type: "complete", job })}
                      >
                        {completingId === job.id
                          ? "Đang xử lý..."
                          : "Kết thúc tuyển dụng"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-job-delete"
                      onClick={() => setPendingAction({ type: "delete", job })}
                    >
                      Xóa tin
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingAction !== null}
        variant={isDeleteAction ? "danger" : "default"}
        title={
          isDeleteAction ? "Xóa tin tuyển dụng?" : "Kết thúc tin tuyển dụng?"
        }
        message={`Bạn có chắc chắn muốn ${
          isDeleteAction ? "xóa" : "kết thúc"
        } tin tuyển dụng "${pendingTitle}" không?`}
        confirmText={isDeleteAction ? "Xóa tin" : "Kết thúc tin"}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </main>
  );
}

export default RecruiterJobs;