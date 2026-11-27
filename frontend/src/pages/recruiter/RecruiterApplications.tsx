import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getReceivedApplications,
  downloadApplicationCV,
  updateApplicationStatus,
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

function getNextStatuses(
  status: ApplicationStatus
): { value: "reviewing" | "interview" | "accepted" | "rejected"; label: string }[] {
  const nextStatuses: Record<
    ApplicationStatus,
    { value: "reviewing" | "interview" | "accepted" | "rejected"; label: string }[]
  > = {
    submitted: [
      { value: "reviewing", label: "Đang xem xét" },
      { value: "interview", label: "Phỏng vấn" },
      { value: "rejected", label: "Bị từ chối" },
    ],
    reviewing: [
      { value: "interview", label: "Phỏng vấn" },
      { value: "accepted", label: "Được chấp nhận" },
      { value: "rejected", label: "Bị từ chối" },
    ],
    interview: [
      { value: "accepted", label: "Được chấp nhận" },
      { value: "rejected", label: "Bị từ chối" },
    ],
    accepted: [],
    rejected: [],
    withdrawn: [],
  };

  return nextStatuses[status];
}

function RecruiterApplications() {
  const { jobId } = useParams<{ jobId: string }>();

  const [applications, setApplications] = useState<ReceivedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "" >("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<ReceivedApplication | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");


  const handleViewCV = async (application: ReceivedApplication) => {
    if (!application.resume_url) {
      setCvError("Ứng viên chưa tải CV lên.");
      return;
    }
    try {
      setCvLoading(true);
      setCvError("");
      setSelectedApplication(application);

      if (cvUrl) {
        window.URL.revokeObjectURL(cvUrl);
        setCvUrl(null);
      }

      const blob = await downloadApplicationCV(application.id);

      if (blob.type !== "application/pdf") {
        throw new Error("Hiện tại chỉ hỗ trợ xem trực tiếp file PDF.");
      }

      const url = window.URL.createObjectURL(blob);
      setCvUrl(url);
    } catch (err) {
      setCvError(
        err instanceof Error ? err.message : "Không thể hiển thị CV."
      );
    } finally {
      setCvLoading(false);
    }
  };

  const handleUpdateStatus = async (
    application: ReceivedApplication,
    newStatus: "reviewing" | "interview" | "accepted" | "rejected"
  ) => {
    try {
      setUpdatingApplicationId(application.id);
      setActionError("");
      setSuccessMessage("");

      const updatedApplication = await updateApplicationStatus(
        application.id,
        newStatus
      );

      setApplications((prev) =>
        prev.map((item) =>
          item.id === application.id
            ? { ...item, status: updatedApplication.status }
            : item
        )
      );

      setSuccessMessage(
        `Đã cập nhật trạng thái hồ sơ của ${application.candidate.full_name}.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái hồ sơ."
      );
    } finally {
      setUpdatingApplicationId(null);
    }
  };

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

      {actionError && (
        <p className="error-message">{actionError}</p>
      )}

      {successMessage && (
        <p className="success-message">{successMessage}</p>
      )}

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
              <div className="application-status-control">
                <label htmlFor={`status-${application.id}`}>
                  Trạng thái:
                </label>

                {getNextStatuses(application.status).length > 0 ? (
                  <select
                    id={`status-${application.id}`}
                    value={application.status}
                    disabled={updatingApplicationId === application.id}
                    onChange={(event) =>
                      handleUpdateStatus(
                        application,
                        event.target.value as
                          | "reviewing"
                          | "interview"
                          | "accepted"
                          | "rejected"
                      )
                    }
                  >
                    <option value={application.status}>
                      {getStatusLabel(application.status)}
                    </option>

                    {getNextStatuses(application.status).map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{getStatusLabel(application.status)}</span>
                )}

                {updatingApplicationId === application.id && (
                  <span>Đang cập nhật...</span>
                )}
              </div>
              <div className="recruiter-application-actions">
                {application.resume_url && (
                  <button
                    type="button"
                    onClick={() => handleViewCV(application)}
                    disabled={cvLoading}
                  >
                    Xem CV
                  </button>
                )}

                <Link
                  to={`/recruiter/jobs/${jobId}/applications/${application.id}`}
                >
                  Xem chi tiết hồ sơ
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedApplication && (
        <div className="cv-modal-overlay">
          <section
            className="cv-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-modal-title"
          >
            <header className="cv-modal-header">
              <div>
                <h2 id="cv-modal-title">CV ứng viên</h2>
                <p>{selectedApplication.candidate.full_name}</p>
                <p>{selectedApplication.original_filename}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (cvUrl) {
                    window.URL.revokeObjectURL(cvUrl);
                  }

                  setCvUrl(null);
                  setSelectedApplication(null);
                  setCvError("");
                }}
              >
                Đóng
              </button>
            </header>

            <div className="cv-modal-content">
              {cvLoading && <p>Đang tải CV...</p>}

              {cvError && (
                <p className="error-message">{cvError}</p>
              )}

              {cvUrl && (
                <iframe
                  src={cvUrl}
                  title={`CV của ${selectedApplication.candidate.full_name}`}
                  className="cv-modal-frame"
                />
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default RecruiterApplications;
