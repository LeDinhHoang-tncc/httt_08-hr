import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getReceivedApplications,
  downloadApplicationCV,
  updateApplicationStatus,
  type ReceivedApplication,
  type ApplicationStatus,
} from "../../services/applicationService";

import ConfirmDialog from "../../components/common/ConfirmDialog";

import "./RecruiterApplicationDetail.css";

function getStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    submitted: "Đã nộp",
    reviewing: "Đang xem xét",
    interview: "Phỏng vấn",
    accepted: "Được chấp nhận",
    rejected: "Từ chối",
    withdrawn: "Đã rút đơn",
  };

  return labels[status];
}

function getAvailableStatuses(
  status: ApplicationStatus
): ApplicationStatus[] {
  const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    submitted: ["reviewing", "interview", "rejected"],
    reviewing: ["interview", "accepted", "rejected"],
    interview: ["accepted", "rejected"],
    accepted: [],
    rejected: [],
    withdrawn: [],
  };

  return transitions[status];
}

function RecruiterApplicationDetail() {
  const { jobId, applicationId } = useParams<{
    jobId: string;
    applicationId: string;
  }>();

  const [application, setApplication] =
    useState<ReceivedApplication | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStatus, setSelectedStatus] =
    useState<ApplicationStatus | "">("");

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      if (
        !jobId ||
        !applicationId ||
        !Number.isInteger(Number(jobId)) ||
        !Number.isInteger(Number(applicationId)) ||
        Number(jobId) <= 0 ||
        Number(applicationId) <= 0
      ) {
        setError("Mã tin tuyển dụng hoặc mã đơn ứng tuyển không hợp lệ.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getReceivedApplications({
          jobId: Number(jobId),
          page: 1,
          pageSize: 100,
        });

        const foundApplication = data.items.find(
          (item) => item.id === Number(applicationId)
        );

        if (!foundApplication) {
          setError("Không tìm thấy đơn ứng tuyển.");
          return;
        }

        setApplication(foundApplication);
        setSelectedStatus("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải chi tiết hồ sơ ứng tuyển."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [jobId, applicationId]);

  const handleDownloadCV = async () => {
    if (!application) return;

    try {
      const blob = await downloadApplicationCV(application.id);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = application.original_filename || "CV";
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setAlertMessage(
        err instanceof Error ? err.message : "Không thể tải CV."
      );
    }
  };

  const handleViewCV = async () => {
    if (!application) return;

    try {
      setCvLoading(true);
      setCvError("");

      // Thu hồi URL cũ nếu có
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

  const handleUpdateStatus = async () => {
    if (!application || !selectedStatus) return;

    try {
      setSaving(true);
      setActionError("");
      setSuccessMessage("");

      const updatedApplication = await updateApplicationStatus(
        application.id,
        selectedStatus as
          | "reviewing"
          | "interview"
          | "accepted"
          | "rejected"
      );

      setApplication({
        ...application,
        ...updatedApplication,
      });

      setSelectedStatus("");
      setSuccessMessage("Cập nhật trạng thái hồ sơ thành công.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái hồ sơ."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmStatus = async () => {
    setShowStatusConfirm(false);
    await handleUpdateStatus();
  };

  if (loading) {
    return (
      <main className="recruiter-application-detail">
        Đang tải chi tiết hồ sơ...
      </main>
    );
  }

  if (error || !application) {
    return (
      <main className="recruiter-application-detail">
        <p className="error-message">
          {error || "Không tìm thấy đơn ứng tuyển."}
        </p>

        <Link to={`/recruiter/jobs/${jobId}/applications`}>
          Quay lại danh sách đơn ứng tuyển
        </Link>
      </main>
    );
  }

  const availableStatuses = getAvailableStatuses(application.status);

  return (
    <main className="recruiter-application-detail">
      <Link to={`/recruiter/jobs/${jobId}/applications`}>
        Quay lại danh sách đơn ứng tuyển
      </Link>

      <section className="recruiter-application-info">
        <h1>Chi tiết hồ sơ ứng tuyển #{application.id}</h1>

        <h2>Thông tin ứng viên</h2>

        <p>Họ tên: {application.candidate.full_name}</p>
        <p>Email: {application.candidate.email}</p>

        <h2>Thông tin công việc</h2>

        <p>Vị trí: {application.job.title}</p>
        <p>Công ty: {application.job.company_name}</p>

        <h2>Thông tin đơn ứng tuyển</h2>

        <p>
          Trạng thái: {getStatusLabel(application.status)}
        </p>

        <p>
          Ngày ứng tuyển:{" "}
          {new Date(application.created_at).toLocaleString("vi-VN")}
        </p>

        <h3>CV ứng tuyển</h3>

        <p>
          Tên file: {application.original_filename || "Chưa có CV"}
        </p>

        {application.resume_url && (
          <button type="button" onClick={handleDownloadCV}>
            Tải CV
          </button>
        )}

        {application.resume_url && (
          <div className="application-cv-preview">
            <button
              type="button"
              onClick={handleViewCV}
              disabled={cvLoading}
            >
              {cvLoading ? "Đang tải CV..." : "Xem CV trực tiếp"}
            </button>

            {cvError && (
              <p className="error-message">{cvError}</p>
            )}

            {cvUrl && (
              <iframe
                src={cvUrl}
                title={`CV của ${application.candidate.full_name}`}
                className="application-cv-frame"
              />
            )}
          </div>
        )}
        <h3>Thư giới thiệu</h3>

        <p>
          {application.cover_letter || "Không có thư giới thiệu."}
        </p>
      </section>

      <section className="recruiter-application-actions">
        <h2>Xử lý hồ sơ</h2>

        {availableStatuses.length > 0 ? (
          <>
            <label htmlFor="application-status">
              Trạng thái mới
            </label>

            <select
              id="application-status"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value as ApplicationStatus | ""
                )
              }
              disabled={saving}
            >
              <option value="">-- Chọn trạng thái --</option>

              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowStatusConfirm(true)}
              disabled={!selectedStatus || saving}
            >
              {saving ? "Đang cập nhật..." : "Cập nhật trạng thái"}
            </button>
          </>
        ) : (
          <p>Hồ sơ đã kết thúc vòng đời, không thể thay đổi trạng thái.</p>
        )}

        {actionError && (
          <p className="error-message">{actionError}</p>
        )}

        {successMessage && (
          <p className="success-message">{successMessage}</p>
        )}
      </section>

      <ConfirmDialog
        open={showStatusConfirm}
        variant={selectedStatus === "rejected" ? "danger" : "default"}
        title="Cập nhật trạng thái hồ sơ?"
        message={`Bạn có chắc chắn muốn chuyển trạng thái hồ sơ sang "${
          selectedStatus ? getStatusLabel(selectedStatus) : ""
        }" không?`}
        confirmText="Xác nhận"
        onConfirm={handleConfirmStatus}
        onCancel={() => setShowStatusConfirm(false)}
      />

      <ConfirmDialog
        open={alertMessage !== ""}
        variant="danger"
        title="Có lỗi xảy ra"
        message={alertMessage}
        confirmText="Đóng"
        showCancel={false}
        onConfirm={() => setAlertMessage("")}
        onCancel={() => setAlertMessage("")}
      />
    </main>
  );
}

export default RecruiterApplicationDetail;