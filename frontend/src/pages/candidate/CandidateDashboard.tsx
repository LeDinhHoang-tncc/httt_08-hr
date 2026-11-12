import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMyApplications,
  getJobById,
  type Application,
} from "../../services/applicationService";
import type { Job } from "../../types/job";
import { Link } from "react-router-dom";

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

function CandidateDashboard() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Record<number, Job | null>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default CandidateDashboard;
