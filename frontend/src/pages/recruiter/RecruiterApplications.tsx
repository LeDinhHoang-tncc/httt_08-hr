import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getReceivedApplications,
  type ReceivedApplication,
  type ApplicationStatus,
} from "../../services/applicationService";

import "./RecruiterApplications.css";

function getStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    submitted: "Đã nộp",
    reviewing: "Đang xem xét",
    interview: "Phỏng vấn",
    accepted: "Được chấp nhận",
    rejected: "Bị từ chối",
    withdrawn: "Đã rút đơn",
  };

  return labels[status];
}

function RecruiterApplications() {
  const { jobId } = useParams<{ jobId: string }>();

  const [applications, setApplications] = useState<ReceivedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ApplicationStatus | ""
  >("");

  useEffect(() => {
    const fetchApplications = async () => {
      if (!jobId || !Number.isInteger(Number(jobId)) || Number(jobId) <= 0) {
        setError("ID tin tuyển dụng không hợp lệ.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getReceivedApplications({
          jobId: Number(jobId),
          applicationStatus: statusFilter || undefined,
        });

        setApplications(data.items);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đơn ứng tuyển."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [jobId, statusFilter]);

  return (
    <main className="recruiter-applications">
      <header className="recruiter-applications-header">
        <h1>Danh sách đơn ứng tuyển</h1>

        <Link to="/recruiter/dashboard">
          Quay lại trang quản lý
        </Link>
      </header>

      <section className="recruiter-applications-filter">
        <label htmlFor="application-status-filter">
          Lọc theo trạng thái:
        </label>

        <select
          id="application-status-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ApplicationStatus | "")
          }
        >
          <option value="">Tất cả trạng thái</option>
          <option value="submitted">Đã nộp</option>
          <option value="reviewing">Đang xem xét</option>
          <option value="interview">Phỏng vấn</option>
          <option value="accepted">Được chấp nhận</option>
          <option value="rejected">Bị từ chối</option>
          <option value="withdrawn">Đã rút đơn</option>
        </select>
      </section>

      {loading && <p>Đang tải danh sách đơn ứng tuyển...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <p>Chưa có đơn ứng tuyển phù hợp.</p>
      )}

      {!loading && !error && applications.length > 0 && (
        <section className="recruiter-application-list">
          <p>Tổng số đơn: {applications.length}</p>

          {applications.map((application: ReceivedApplication) => (
            <article
              className="recruiter-application-item"
              key={application.id}
            >
              <h2>{application.candidate.full_name}</h2>

              <p>Email: {application.candidate.email}</p>

              <p>
                Vị trí: {application.job.title}
              </p>

              <p>
                Công ty: {application.job.company_name}
              </p>

              <p>
                Ngày ứng tuyển:{" "}
                {new Date(application.created_at).toLocaleDateString("vi-VN")}
              </p>

              <p>
                Trạng thái: {getStatusLabel(application.status)}
              </p>

              <Link
                to={`/recruiter/jobs/${jobId}/applications/${application.id}`}
              >
                Xem chi tiết hồ sơ
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default RecruiterApplications;
