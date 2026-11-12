import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// import "./App.css";
import JobDetail from "./pages/public/JobDetail";

import ProtectedRoute from "./components/common/ProtectedRoute";

import CandidateApplicationDetail from "./pages/candidate/CandidateApplicationDetail";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";


interface Job {
  id: number;
  title: string;
  company_name: string;
  description: string;
  requirements: string | null;
  location: string;
  employment_type: string;
  salary_min: string | null;
  salary_max: string | null;
  created_at: string;
}

// Số việc làm hiển thị ban đầu và mỗi lần bấm "Xem thêm"
const PAGE_SIZE = 12;

function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchJobs = async (
    searchKeyword = "",
    searchLocation = ""
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (searchKeyword.trim()) {
        params.append("keyword", searchKeyword.trim());
      }

      if (searchLocation.trim()) {
        params.append("location", searchLocation.trim());
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/jobs?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Không thể tải danh sách việc làm.");
      }

      const data = await response.json();

      const jobList = Array.isArray(data)
        ? data
        : Array.isArray(data.value)
          ? data.value
          : [];

      setJobs(jobList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Mỗi khi danh sách việc làm đổi (tìm kiếm / xóa bộ lọc) thì quay về 12 tin đầu
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [jobs]);

  const formatSalary = (
    min: string | null,
    max: string | null
  ) => {
    if (!min && !max) return "Thỏa thuận";

    const format = (value: string) =>
      Number(value).toLocaleString("vi-VN");

    if (min && max) return `${format(min)} - ${format(max)} USD`;
    if (min) return `Từ ${format(min)} USD`;

    return `Đến ${format(max!)} USD`;
  };

  const visibleJobs = jobs.slice(0, visibleCount);
  const hasMore = visibleCount < jobs.length;

  return (
    <>

      <main className="main-container">
        <section className="hero">
          <h1>Tìm kiếm công việc phù hợp với bạn</h1>
          <p>Khám phá cơ hội nghề nghiệp và kết nối với nhà tuyển dụng.</p>

          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              fetchJobs(keyword, location);
            }}
          >
            <input
              type="text"
              placeholder="Tên công việc hoặc công ty"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />

            <input
              type="text"
              placeholder="Địa điểm làm việc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <button type="submit" disabled={loading}>
              Tìm kiếm
            </button>

            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setLocation("");
                fetchJobs();
              }}
            >
              Xóa bộ lọc
            </button>
          </form>
        </section>

        <section className="jobs-section" id="jobs">
          <h2>Việc làm mới nhất</h2>

          {loading && <p>Đang tải việc làm...</p>}
          {error && <p>{error}</p>}

          {!loading && !error && jobs.length === 0 && (
            <p>Hiện chưa có việc làm nào.</p>
          )}

          <div className="jobs-list">
            {visibleJobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-card-main">
                  <h3>{job.title}</h3>
                  <p className="job-company">{job.company_name}</p>

                  <div className="job-tags">
                    <span className="job-tag">{job.location}</span>
                    <span className="job-tag job-tag-salary">
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/jobs/${job.id}`}
                  className="job-detail-link"
                >
                  Xem chi tiết
                </Link>
              </article>
            ))}
          </div>

          {!loading && !error && jobs.length > PAGE_SIZE && (
            <div className="load-more">
              <span className="load-more-count">
                Đang hiển thị {visibleJobs.length} / {jobs.length} việc làm
              </span>

              {hasMore && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((count) => count + PAGE_SIZE)
                  }
                >
                  Xem thêm
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function App() {
  return (
<Routes>
  {/* Layout chính */}
  <Route element={<MainLayout />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/jobs/:jobId" element={<JobDetail />} />

    {/* Các trang cần đăng nhập */}
    <Route element={<ProtectedRoute allowedRoles={["candidate"]} />}>
      <Route
        path="/candidate/dashboard"
        element={<CandidateDashboard />}
      />
      <Route
        path="/candidate/applications/:applicationId"
        element={<CandidateApplicationDetail />}
      />
    </Route>
  </Route>

  {/* Layout xác thực */}
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
  </Route>
</Routes>
  );
}

export default App;