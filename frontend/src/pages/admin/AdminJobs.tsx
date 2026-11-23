import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    getManagedJobs,
    hideJob,
    unhideJob,
} from "../../services/jobService";
import type { Job } from "../../types/job";

import "./AdminJobs.css";  

function AdminJobs() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [keyword, setKeyword] = useState("");
    const [jobStatus, setJobStatus] = useState("");
    const [isHidden, setIsHidden] = useState("");

    const loadJobs = async () => {
        try {
            setLoading(true);
            setError("");

            const result = await getManagedJobs({
                keyword: keyword || undefined,
                jobStatus: jobStatus
                    ? (jobStatus as "draft" | "published" | "completed")
                    : undefined,
                isHidden: isHidden === ""
                    ? undefined
                    : isHidden === "true",
                page: 1,    
                pageSize: 100,
            });

            setJobs(result);    
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : "Không thể tải danh sách tin tuyển dụng."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisibility = async (job: Job) => {
        const action = job.is_hidden ? "hiện" : "ẩn";

        const confirmed = window.confirm(
            `Bạn có chắc muốn ${action} tin tuyển dụng "${job.title}"?`
        );

        if (!confirmed) return;

        try {
            setError("");

            if (job.is_hidden) {
            await unhideJob(job.id);
            } else {
            await hideJob(job.id);
            }

            await loadJobs();
        } catch (err) {
            setError(
            err instanceof Error
                ? err.message
                : "Không thể thay đổi trạng thái tin tuyển dụng."
            );
        }
    };

    useEffect(() => {
        loadJobs();
    }, []);

  return (
    <main className="admin-jobs">
      <h1>Quản lý tin tuyển dụng</h1>

      <Link
        to="/admin/dashboard"
        className="btn-back-dashboard"
      >
        ← Quay về Dashboard Admin
      </Link>

      {error && <p>{error}</p>}

      <div className="admin-job-filters">
        <input
          type="text"
          placeholder="Tìm theo tên công việc..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <select
          value={jobStatus}
          onChange={(e) => setJobStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="published">Đang tuyển</option>
          <option value="completed">Đã hoàn thành</option>
        </select>

        <select
          value={isHidden}
          onChange={(e) => setIsHidden(e.target.value)}
        >
          <option value="">Ẩn và hiện</option>
          <option value="false">Đang hiển thị</option>
          <option value="true">Đang bị ẩn</option>
        </select>

        <button type="button" onClick={loadJobs}>
          Tìm kiếm
        </button>
      </div>

      {loading ? (
        <p>Đang tải danh sách tin tuyển dụng...</p>
      ) : jobs.length === 0 ? (
        <p>Không tìm thấy tin tuyển dụng nào.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vị trí tuyển dụng</th>
              <th>Công ty</th>
              <th>Người đăng</th>
              <th>Trạng thái</th>
              <th>Hiển thị</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.title}</td>
                <td>{job.company_name}</td>
                <td>{job.created_by}</td>
                <td>{job.status}</td>
                <td>
                <button
                    type="button"
                    onClick={() => handleToggleVisibility(job)}>
                    {job.is_hidden ? "Hiện tin" : "Ẩn tin"}
                </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default AdminJobs;
