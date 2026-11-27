import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

import { getManagedJobs } from "../../services/jobService";
import {
  getReceivedApplications,
  type ApplicationStatus,
} from "../../services/applicationService";

import type { Job } from "../../types/job";

import "./RecruiterDashboard.css";


interface DashboardStats {
  totalJobs: number;
  publishedJobs: number;
  draftJobs: number;
  completedJobs: number;
  hiddenJobs: number;

  totalApplications: number;
  submittedApplications: number;
  reviewingApplications: number;
  interviewApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  withdrawnApplications: number;
}

const initialStats: DashboardStats = {
  totalJobs: 0,
  publishedJobs: 0,
  draftJobs: 0,
  completedJobs: 0,
  hiddenJobs: 0,

  totalApplications: 0,
  submittedApplications: 0,
  reviewingApplications: 0,
  interviewApplications: 0,
  acceptedApplications: 0,
  rejectedApplications: 0,
  withdrawnApplications: 0,
};

const applicationStatuses: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "interview",
  "accepted",
  "rejected",
  "withdrawn",
];

function RecruiterDashboard() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        // Lấy toàn bộ tin tuyển dụng theo từng trang
        const jobs: Job[] = [];
        let page = 1;

        while (true) {
          const currentJobs = await getManagedJobs({
            page,
            pageSize: 100,
          });

          jobs.push(...currentJobs);

          if (currentJobs.length < 100) {
            break;
          }

          page++;
        }

        // Lấy tổng số hồ sơ và số lượng theo từng trạng thái
        const [allApplications, ...applicationResults] =
          await Promise.all([
            getReceivedApplications({
              page: 1,
              pageSize: 1,
            }),
            ...applicationStatuses.map((status) =>
              getReceivedApplications({
                applicationStatus: status,
                page: 1,
                pageSize: 1,
              })
            ),
          ]);

        const applicationCounts = Object.fromEntries(
          applicationStatuses.map((status, index) => [
            status,
            applicationResults[index].total,
          ])
        );

        const newStats: DashboardStats = {
          totalJobs: jobs.length,
          publishedJobs: jobs.filter(
            (job) => job.status === "published"
          ).length,
          draftJobs: jobs.filter(
            (job) => job.status === "draft"
          ).length,
          completedJobs: jobs.filter(
            (job) => job.status === "completed"
          ).length,
          hiddenJobs: jobs.filter((job) => job.is_hidden).length,

          totalApplications: allApplications.total,
          submittedApplications: applicationCounts.submitted,
          reviewingApplications: applicationCounts.reviewing,
          interviewApplications: applicationCounts.interview,
          acceptedApplications: applicationCounts.accepted,
          rejectedApplications: applicationCounts.rejected,
          withdrawnApplications: applicationCounts.withdrawn,
        };

        if (!cancelled) {
          setStats(newStats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải dữ liệu thống kê."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="recruiter-dashboard">
        <p>Đang tải dữ liệu thống kê...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="recruiter-dashboard">
        <p className="error-message">{error}</p>
      </main>
    );
  }

  return (
    <main className="recruiter-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-text">
          <p className="dashboard-eyebrow">Trang nhà tuyển dụng</p>
          <h1>Tổng quan tuyển dụng</h1>
          <p className="dashboard-greeting">
            Xin chào, {user?.full_name}! Theo dõi tình hình tuyển dụng của bạn.
          </p>
        </div>

        <p className="dashboard-email">Email: {user?.email}</p>
      </header>

      <section className="dashboard-section">
        <h2>Thống kê tin tuyển dụng</h2>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Tổng số tin</h3>
            <p>{stats.totalJobs}</p>
          </div>

          <div className="stat-card">
            <h3>Đang tuyển dụng</h3>
            <p>{stats.publishedJobs}</p>
          </div>

          <div className="stat-card">
            <h3>Bản nháp</h3>
            <p>{stats.draftJobs}</p>
          </div>

          <div className="stat-card">
            <h3>Đã kết thúc</h3>
            <p>{stats.completedJobs}</p>
          </div>

          <div className="stat-card">
            <h3>Đang bị ẩn</h3>
            <p>{stats.hiddenJobs}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Thống kê hồ sơ ứng tuyển</h2>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Tổng hồ sơ</h3>
            <p>{stats.totalApplications}</p>
          </div>

          <div className="stat-card">
            <h3>Đã nộp</h3>
            <p>{stats.submittedApplications}</p>
          </div>

          <div className="stat-card">
            <h3>Đang xem xét</h3>
            <p>{stats.reviewingApplications}</p>
          </div>

          <div className="stat-card">
            <h3>Phỏng vấn</h3>
            <p>{stats.interviewApplications}</p>
          </div>

          <div className="stat-card">
            <h3>Được chấp nhận</h3>
            <p>{stats.acceptedApplications}</p>
          </div>

          <div className="stat-card">
            <h3>Bị từ chối</h3>
            <p>{stats.rejectedApplications}</p>
          </div>

          <div className="stat-card">
            <h3>Đã rút đơn</h3>
            <p>{stats.withdrawnApplications}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Truy cập nhanh</h2>

        <div className="dashboard-actions">
          <Link to="/recruiter/jobs">
            Quản lý tin tuyển dụng
          </Link>

          <Link to="/recruiter/jobs/create">
            Tạo tin tuyển dụng
          </Link>

          <Link to="/recruiter/interviews">
            Quản lý lịch phỏng vấn
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RecruiterDashboard;