import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Job } from "../../types/job";
import { useAuth } from "../../contexts/AuthContext";
import { createApplication } from "../../services/applicationService";

import "./JobDetail.css";

function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationError, setApplicationError] = useState("");

  useEffect(() => {
    const fetchJobDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://127.0.0.1:8000/api/jobs/${jobId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Không tìm thấy tin tuyển dụng.");
          }

          throw new Error("Không thể tải chi tiết việc làm.");
        }

        const data: Job = await response.json();
        setJob(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Đã xảy ra lỗi."
        );
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetail();
    } else {
      setError("Mã tin tuyển dụng không hợp lệ.");
      setLoading(false);
    }
  }, [jobId]);

  const closeApplicationForm = () => {
    if (submitting) return;
    setShowApplicationForm(false);
  };

  // Hộp ứng tuyển: bấm Esc để đóng, khóa cuộn trang nền khi đang mở
  useEffect(() => {
    if (!showApplicationForm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        setShowApplicationForm(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showApplicationForm, submitting]);

  const formatSalary = (
    min: string | null,
    max: string | null
  ) => {
    if (!min && !max) return "Thỏa thuận";

    const format = (value: string) =>
      Number(value).toLocaleString("vi-VN");

    if (min && max) {
      return `${format(min)} - ${format(max)} USD`;
    }

    if (min) return `Từ ${format(min)} USD`;

    return `Đến ${format(max!)} USD`;
  };

  const formatEmploymentType = (type: string) => {
    const types: Record<string, string> = {
      full_time: "Toàn thời gian",
      part_time: "Bán thời gian",
      internship: "Thực tập",
      contract: "Hợp đồng",
    };

    return types[type] || type;
  };

  const handleApplyClick = () => {
    setApplicationMessage("");
    setApplicationError("");

    if (!isAuthenticated) {
      setApplicationMessage("Vui lòng đăng nhập để ứng tuyển.");
      setShowApplicationForm(false);
      return;
    }

    if (user?.role !== "candidate") {
      setApplicationMessage("Tài khoản của bạn không có quyền ứng tuyển.");
      setShowApplicationForm(false);
      return;
    }

    setShowApplicationForm((previous) => !previous);
  };

  const handleSubmitApplication = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!job || !cvFile) {
      setApplicationError("Vui lòng chọn CV để nộp hồ sơ.");
      return;
    }

    try {
      setSubmitting(true);
      setApplicationError("");
      setApplicationMessage("");

      await createApplication({
        jobId: job.id,
        coverLetter,
        cvFile,
      });

      setApplicationMessage("Nộp hồ sơ thành công!");
      setShowApplicationForm(false);
      setCoverLetter("");
      setCvFile(null);
    } catch (err) {
      setApplicationError(
        err instanceof Error
          ? err.message
          : "Không thể nộp hồ sơ ứng tuyển."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="job-detail-page">Đang tải chi tiết việc làm...</div>;
  }

  if (error || !job) {
    return (
      <div className="job-detail-page">
        <p>{error || "Không tìm thấy tin tuyển dụng."}</p>
        <button type="button" onClick={() => navigate("/")}>
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <main className="job-detail-page">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/")}
      >
        Quay lại danh sách việc làm
      </button>

      <section className="job-detail-header">
        <h1>{job.title}</h1>
        <p>{job.company_name}</p>
      </section>

      <section className="job-detail-info">
        <h2>Thông tin tuyển dụng</h2>

        <p><strong>Địa điểm:</strong> {job.location}</p>

        <p>
          <strong>Hình thức:</strong>{" "}
          {formatEmploymentType(job.employment_type)}
        </p>

        <p>
          <strong>Mức lương:</strong>{" "}
          {formatSalary(job.salary_min, job.salary_max)}
        </p>

        <p>
          <strong>Ngày đăng:</strong>{" "}
          {new Date(job.created_at).toLocaleDateString("vi-VN")}
        </p>
      </section>

      <section className="job-detail-description">
        <h2>Mô tả công việc</h2>
        <p>{job.description}</p>
      </section>

      <section className="job-detail-requirements">
        <h2>Yêu cầu ứng viên</h2>
        <p>{job.requirements || "Chưa có thông tin yêu cầu."}</p>
      </section>

      <section className="job-application">
        <div className="job-application-head">
          <h2>Ứng tuyển</h2>

          <button
            type="button"
            className="btn-apply"
            onClick={handleApplyClick}
          >
            Ứng tuyển ngay
          </button>
        </div>

        {!applicationMessage && !applicationError && (
          <p className="job-application-hint">
            Gửi CV và thư giới thiệu để nhà tuyển dụng biết đến bạn.
          </p>
        )}

        {applicationMessage && (
          <p className="application-message">
            {applicationMessage}
            {!isAuthenticated && (
              <>
                {" "}
                <Link to="/login">Đăng nhập ngay</Link>
              </>
            )}
          </p>
        )}

        {applicationError && !showApplicationForm && (
          <p className="application-error">{applicationError}</p>
        )}

        {showApplicationForm && (
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeApplicationForm();
              }
            }}
          >
            <div
              className="modal-box"
              role="dialog"
              aria-modal="true"
              aria-labelledby="applicationModalTitle"
            >
              <div className="modal-header">
                <div>
                  <h3 id="applicationModalTitle">Nộp hồ sơ ứng tuyển</h3>
                  <p className="modal-subtitle">
                    {job.title} · {job.company_name}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  aria-label="Đóng"
                  onClick={closeApplicationForm}
                >
                  ×
                </button>
              </div>

              {applicationError && (
                <p className="application-error">{applicationError}</p>
              )}

              <form
                className="application-form"
                onSubmit={handleSubmitApplication}
              >
                <div className="form-field">
                  <label htmlFor="coverLetter">
                    Thư giới thiệu
                  </label>
                  <textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    maxLength={5000}
                    placeholder="Giới thiệu bản thân và lý do bạn phù hợp với công việc..."
                  />
                  <span className="field-hint">{coverLetter.length}/5000</span>
                </div>

                <div className="form-field">
                  <label htmlFor="cvFile">
                    CV (PDF hoặc DOCX)
                  </label>
                  <input
                    id="cvFile"
                    type="file"
                    accept=".pdf,.docx"
                    required
                    onChange={(event) =>
                      setCvFile(event.target.files?.[0] || null)
                    }
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={closeApplicationForm}
                  >
                    Hủy
                  </button>

                  <button type="submit" disabled={submitting}>
                    {submitting ? "Đang nộp hồ sơ..." : "Gửi hồ sơ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default JobDetail;