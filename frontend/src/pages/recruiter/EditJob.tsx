import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getManagedJobById,
  updateJob,
  type JobFormData,
} from "../../services/jobService";

import type { Job } from "../../types/job";

import "./EditJob.css";

function EditJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);

  const [form, setForm] = useState<JobFormData>({
    title: "",
    company_name: "",
    description: "",
    requirements: "",
    location: "",
    employment_type: "full_time",
    salary_min: null,
    salary_max: null,
    status: "draft",
  });

  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        setError("");

        const id = Number(jobId);

        if (!jobId || !Number.isInteger(id) || id <= 0) {
          throw new Error("ID tin tuyển dụng không hợp lệ.");
        }

        const data = await getManagedJobById(id);

        setJob(data);

        setForm({
          title: data.title,
          company_name: data.company_name,
          description: data.description,
          requirements: data.requirements || "",
          location: data.location,
          employment_type: data.employment_type as JobFormData["employment_type"],
          salary_min: data.salary_min ? Number(data.salary_min) : null,
          salary_max: data.salary_max ? Number(data.salary_max) : null,
          status: data.status === "published" ? "published" : "draft",
        });

        setSalaryMin(data.salary_min ?? "");
        setSalaryMax(data.salary_max ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải thông tin tin tuyển dụng."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleChange = (
    field: keyof JobFormData,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!job) return;

    const min = salaryMin.trim() ? Number(salaryMin) : null;
    const max = salaryMax.trim() ? Number(salaryMax) : null;

    if (
      (min !== null && (!Number.isFinite(min) || min < 0)) ||
      (max !== null && (!Number.isFinite(max) || max < 0))
    ) {
      setError("Mức lương phải là số không âm.");
      return;
    }

    if (min !== null && max !== null && min > max) {
      setError("Mức lương tối thiểu không được lớn hơn mức tối đa.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const data: Partial<JobFormData> = {
        title: form.title,
        company_name: form.company_name,
        description: form.description,
        requirements: form.requirements?.trim() || null,
        location: form.location,
        employment_type: form.employment_type,
        salary_min: min,
        salary_max: max,
      };

      // Không thay đổi trạng thái nếu tin đã kết thúc.
      if (job.status !== "completed") {
        data.status = form.status;
      }

      await updateJob(job.id, data);

      navigate("/recruiter/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật tin tuyển dụng."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Đang tải thông tin tin tuyển dụng...</p>;
  }

  if (!job) {
    return (
      <main className="edit-job-page">
        <p className="error-message">
          {error || "Không tìm thấy tin tuyển dụng."}
        </p>
        <Link to="/recruiter/dashboard">Quay lại</Link>
      </main>
    );
  }

  return (
    <main className="edit-job-page">
      <h1>Chỉnh sửa tin tuyển dụng</h1>

      <form className="edit-job-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Tiêu đề công việc</label>
          <input
            id="title"
            type="text"
            minLength={3}
            maxLength={200}
            required
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="company_name">Tên công ty</label>
          <input
            id="company_name"
            type="text"
            minLength={2}
            maxLength={150}
            required
            value={form.company_name}
            onChange={(e) =>
              handleChange("company_name", e.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="description">Mô tả công việc</label>
          <textarea
            id="description"
            minLength={10}
            required
            value={form.description}
            onChange={(e) =>
              handleChange("description", e.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="requirements">Yêu cầu công việc</label>
          <textarea
            id="requirements"
            value={form.requirements || ""}
            onChange={(e) =>
              handleChange("requirements", e.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="location">Địa điểm làm việc</label>
          <input
            id="location"
            type="text"
            minLength={2}
            maxLength={200}
            required
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="employment_type">Loại hình làm việc</label>
          <select
            id="employment_type"
            value={form.employment_type}
            onChange={(e) =>
              handleChange("employment_type", e.target.value)
            }
          >
            <option value="full_time">Toàn thời gian</option>
            <option value="part_time">Bán thời gian</option>
            <option value="internship">Thực tập</option>
            <option value="contract">Hợp đồng</option>
          </select>
        </div>

        <div>
          <label htmlFor="salary_min">Lương tối thiểu</label>
          <input
            id="salary_min"
            type="number"
            min="0"
            step="any"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="salary_max">Lương tối đa</label>
          <input
            id="salary_max"
            type="number"
            min="0"
            step="any"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="status">Trạng thái tin tuyển dụng</label>
          <select
            id="status"
            value={form.status}
            disabled={job.status === "completed"}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="draft">Bản nháp</option>
            <option value="published">Đang tuyển dụng</option>
          </select>

          {job.status === "completed" && (
            <p>Tin đã kết thúc nên không thể thay đổi trạng thái.</p>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="edit-job-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

          <Link to="/recruiter/dashboard">Quay lại</Link>
        </div>
      </form>
    </main>
  );
}

export default EditJob;
