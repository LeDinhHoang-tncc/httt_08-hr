import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getApplicationById,
  getJobById,
  downloadApplicationCV,
  updateApplication,
  withdrawApplication,
  type Application,
} from "../../services/applicationService";
import type { Job } from "../../types/job";

import "./CandidateApplicationDetail.css";

function CandidateApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();

  const [application, setApplication] = useState<Application | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      if (!applicationId || !Number.isInteger(Number(applicationId))) {
        setError("Mã đơn ứng tuyển không hợp lệ.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const applicationData = await getApplicationById(
          Number(applicationId)
        );

        setApplication(applicationData);

        const jobData = await getJobById(applicationData.job_id);
        setJob(jobData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải chi tiết đơn ứng tuyển."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [applicationId]);

  // Hộp chỉnh sửa: bấm Esc để đóng, khóa cuộn trang nền khi đang mở
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setIsEditing(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, saving]);

  if (loading) {
    return <main className="application-detail">Đang tải chi tiết đơn ứng tuyển...</main>;
  }

  if (error) {
    return (
      <main className="application-detail">
        <p className="error-message">{error}</p>
        <Link to="/candidate/dashboard">Quay lại trang ứng viên</Link>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="application-detail">
        <p>Không tìm thấy đơn ứng tuyển.</p>
        <Link to="/candidate/dashboard">Quay lại trang ứng viên</Link>
      </main>
    );
  }

  const statusLabels: Record<string, string> = {
    submitted: "Đã nộp",
    reviewing: "Đang xem xét",
    interview: "Phỏng vấn",
    accepted: "Được chấp nhận",
    rejected: "Bị từ chối",
    withdrawn: "Đã rút đơn",
  };


  const handleDownloadCV = async () => {
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
      alert(
        err instanceof Error ? err.message : "Không thể tải CV."
      );
    }
  };

  const handleUpdateApplication = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setSaving(true);
      setEditError("");
      setEditSuccess("");

      const updatedApplication = await updateApplication(application.id, {
        coverLetter,
        cvFile: cvFile || undefined,
      });

      setApplication(updatedApplication);
      setIsEditing(false);
      setCvFile(null);
      setEditSuccess("Cập nhật đơn ứng tuyển thành công.");
    } catch (err) {
      setEditError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật đơn ứng tuyển."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawApplication = async () => {
    const confirmed = window.confirm(
        "Bạn có chắc chắn muốn rút đơn ứng tuyển này không?"
      );

      if (!confirmed) return;

      try {
        const updatedApplication = await withdrawApplication(application.id);
        setApplication(updatedApplication);
        setEditSuccess("Đã rút đơn ứng tuyển thành công.");
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Không thể rút đơn ứng tuyển."
        );
      }
    };


  const closeEditForm = () => {
    if (saving) return;

    setIsEditing(false);
    setCoverLetter(application.cover_letter || "");
    setCvFile(null);
    setEditError("");
  };

  return (
    <main className="application-detail">
      <Link to="/candidate/dashboard">Quay lại danh sách đơn ứng tuyển</Link>

      <section className="application-detail-info">
        <h1>Chi tiết đơn ứng tuyển #{application.id}</h1>

        <h2>Thông tin công việc</h2>

        {job ? (
          <>
            <h3>{job.title}</h3>
            <p>Công ty: {job.company_name}</p>
            <p>Địa điểm: {job.location}</p>
          </>
        ) : (
          <p>Không thể tải thông tin công việc.</p>
        )}

        <h2>Thông tin đơn ứng tuyển</h2>

        <p>
          Trạng thái: {statusLabels[application.status] ?? application.status}
        </p>

        <p>
          Ngày ứng tuyển:{" "}
          {new Date(application.created_at).toLocaleString("vi-VN")}
        </p>

        <div className="application-cv">
          <p>CV: {application.original_filename || "Chưa có CV"}</p>

          {application.resume_url && (
            <button
              type="button"
              className="btn-outline"
              onClick={handleDownloadCV}
            >
              Tải CV
            </button>
          )}
        </div>

        <h3 className="cover-letter-title">Thư giới thiệu</h3>

        <p className="cover-letter">
          {application.cover_letter || "Không có thư giới thiệu."}
        </p>

        {application.status === "submitted" && (
          <div className="application-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setCoverLetter(application.cover_letter || "");
                setCvFile(null);
                setEditError("");
                setEditSuccess("");
                setIsEditing(true);
              }}
            >
              Chỉnh sửa đơn
            </button>

            <button
              type="button"
              className="btn-danger"
              onClick={handleWithdrawApplication}
            >
              Rút đơn ứng tuyển
            </button>
          </div>
        )}

        {editSuccess && (
          <p className="application-success">{editSuccess}</p>
        )}

      </section>

      {isEditing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditForm();
            }
          }}
        >
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editApplicationTitle"
          >
            <div className="modal-header">
              <div>
                <h3 id="editApplicationTitle">Chỉnh sửa đơn ứng tuyển</h3>
                <p className="modal-subtitle">
                  {job
                    ? `${job.title} · ${job.company_name}`
                    : `Đơn ứng tuyển #${application.id}`}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Đóng"
                onClick={closeEditForm}
              >
                ×
              </button>
            </div>

            {editError && <p className="error-message">{editError}</p>}

            <form
              onSubmit={handleUpdateApplication}
              className="application-edit-form"
            >
              <div className="form-field">
                <label htmlFor="coverLetter">Nội dung thư giới thiệu</label>
                <textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  maxLength={5000}
                  rows={8}
                />
                <span className="field-hint">{coverLetter.length}/5000</span>
              </div>

              <div className="form-field">
                <label htmlFor="cvFile">Thay CV (PDF hoặc DOCX)</label>
                <input
                  id="cvFile"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                />

                {cvFile ? (
                  <span className="field-note">CV mới: {cvFile.name}</span>
                ) : (
                  application.original_filename && (
                    <span className="field-note">
                      CV hiện tại: {application.original_filename}. Bỏ trống
                      nếu không muốn thay.
                    </span>
                  )
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={saving}
                  onClick={closeEditForm}
                >
                  Hủy
                </button>

                <button type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default CandidateApplicationDetail;