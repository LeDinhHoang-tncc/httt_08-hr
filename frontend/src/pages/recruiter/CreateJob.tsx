import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createJob, type JobFormData } from "../../services/jobService";

import "./CreateJob.css";

function CreateJob() {
  const navigate = useNavigate();

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setLoading(true);
      setError("");

      const data: JobFormData = {
        ...form,
        requirements: form.requirements?.trim() || null,
        salary_min: min,
        salary_max: max,
      };

      await createJob(data);

      navigate("/recruiter/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tạo tin tuyển dụng."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-job-page">
      <h1>Đăng tin tuyển dụng</h1>

      <form className="create-job-form" onSubmit={handleSubmit}>
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
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="draft">Lưu bản nháp</option>
            <option value="published">Đăng tuyển ngay</option>
          </select>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="create-job-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo tin tuyển dụng"}
          </button>

          <Link to="/recruiter/dashboard">Quay lại</Link>
        </div>
      </form>
    </main>
  );
}

export default CreateJob;
