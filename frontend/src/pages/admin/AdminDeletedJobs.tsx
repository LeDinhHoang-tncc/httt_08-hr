import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDeletedJobs,
  restoreDeletedJob,
} from "../../services/jobService";
import type { Job } from "../../types/job";

import "./AdminDeletedJobs.css";

function AdminDeletedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getDeletedJobs({
        keyword: keyword || undefined,
        page: 1,
        pageSize: 100,
      });

      setJobs(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách tin đã xóa."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (job: Job) => {
  const confirmed = window.confirm(
    `Bạn có chắc muốn khôi phục tin tuyển dụng "${job.title}"?`
  );

  if (!confirmed) return;

  try {
    setError("");

    await restoreDeletedJob(job.id);

    setJobs((prev) =>
      prev.filter((item) => item.id !== job.id)
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Không thể khôi phục tin tuyển dụng."
    );
  }
};

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <main className="admin-deleted-jobs">
      <h1>Tin tuyển dụng đã xóa</h1>

      <Link
        to="/admin/dashboard"
        className="btn-back-dashboard"
      >
        ← Quay về Dashboard Admin
      </Link>

      {error && <p>{error}</p>}

      <div className="admin-deleted-job-filters">
        <input
          type="text"
          placeholder="Tìm theo tên công việc..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <button type="button" onClick={loadJobs}>
          Tìm kiếm
        </button>
      </div>

      {loading ? (
        <p>Đang tải danh sách tin đã xóa...</p>
      ) : jobs.length === 0 ? (
        <p>Không có tin tuyển dụng nào đã xóa.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vị trí tuyển dụng</th>
              <th>Công ty</th>
              <th>Người đăng</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
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
                  {new Date(job.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td>
                <button type="button" onClick={() => handleRestore(job)}> Khôi phục </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default AdminDeletedJobs;
