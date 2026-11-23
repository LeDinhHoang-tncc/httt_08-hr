import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getAdminDashboardStatistics,
} from "../../services/adminService";

import type {
  AdminDashboardStatistics,
} from "../../types/admin";

import "./AdminDashboard.css";

// Màu theo từng loại số liệu, đồng bộ với tông xanh lục của giao diện
const USER_COLORS = ["#0e6b5c", "#5b7cfa", "#f2b441"];
const JOB_COLORS = ["#9aa5b1", "#0e6b5c", "#5b7cfa"];
const APPLICATION_COLORS = [
  "#5b7cfa", // Đã nộp
  "#f2b441", // Đang xem xét
  "#8b6cf6", // Phỏng vấn
  "#0e6b5c", // Được chấp nhận
  "#e5645b", // Bị từ chối
  "#9aa5b1", // Đã rút đơn
];

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid #e3e8ee",
  boxShadow: "0 6px 18px rgba(15, 25, 35, 0.1)",
  fontSize: 13,
};

const AXIS_TICK = { fontSize: 12, fill: "#5b6776" };

// Chú giải: chấm màu + tên + số lượng + phần trăm
function ChartLegend({
  items,
  colors,
}: {
  items: { name: string; value: number }[];
  colors: string[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="chart-legend">
      {items.map((item, index) => (
        <li key={item.name}>
          <span
            className="chart-legend-dot"
            style={{ background: colors[index % colors.length] }}
          />
          <span className="chart-legend-name">{item.name}</span>
          <span className="chart-legend-value">{item.value}</span>
          <span className="chart-legend-percent">
            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function AdminDashboard() {
  const [statistics, setStatistics] =
    useState<AdminDashboardStatistics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAdminDashboardStatistics();
        setStatistics(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải thống kê tổng quan."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const userChartData = statistics
    ? [
        { name: "Ứng viên", value: statistics.users.candidates },
        { name: "Nhà tuyển dụng", value: statistics.users.recruiters },
        { name: "Quản trị viên", value: statistics.users.admins },
      ]
    : [];

  const jobChartData = statistics
    ? [
        { name: "Bản nháp", soLuong: statistics.jobs.draft },
        { name: "Đang tuyển", soLuong: statistics.jobs.published },
        { name: "Hoàn thành", soLuong: statistics.jobs.completed },
      ]
    : [];

  const applicationChartData = statistics
    ? [
        { name: "Đã nộp", value: statistics.applications.submitted },
        { name: "Đang xem xét", value: statistics.applications.reviewing },
        { name: "Phỏng vấn", value: statistics.applications.interview },
        { name: "Được chấp nhận", value: statistics.applications.accepted },
        { name: "Bị từ chối", value: statistics.applications.rejected },
        { name: "Đã rút đơn", value: statistics.applications.withdrawn },
      ]
    : [];

  return (
    <main className="admin-dashboard">
      <h1>Tổng quan hệ thống</h1>
      <p>Quản lý và theo dõi hoạt động của hệ thống tuyển dụng.</p>

      <nav className="admin-menu">
        <Link to="/admin/users">Quản lý tài khoản</Link>
        <Link to="/admin/recruiter-requests">
          Duyệt yêu cầu nhà tuyển dụng
        </Link>
        <Link to="/admin/jobs">Quản lý tin tuyển dụng</Link>
        <Link to="/admin/applications">Quản lý hồ sơ ứng tuyển</Link>
        <Link to="/admin/deleted-jobs">Tin tuyển dụng đã xóa</Link>
      </nav>

      <section className="admin-dashboard-statistics">
        <h2>Thống kê tổng quan</h2>

        {loading && <p>Đang tải dữ liệu thống kê...</p>}

        {error && (
          <p className="admin-dashboard-error">{error}</p>
        )}

        {statistics && !loading && (
          <>
            <div className="admin-statistics-cards">
              <div className="admin-statistics-card">
                <h3>Tổng tài khoản</h3>
                <p>{statistics.users.total}</p>
              </div>

              <div className="admin-statistics-card">
                <h3>Tin tuyển dụng</h3>
                <p>{statistics.jobs.total}</p>
              </div>

              <div className="admin-statistics-card">
                <h3>Hồ sơ ứng tuyển</h3>
                <p>{statistics.applications.total}</p>
              </div>

              <div className="admin-statistics-card">
                <h3>Yêu cầu nhà tuyển dụng chờ duyệt</h3>
                <p>{statistics.pending_recruiters}</p>
              </div>
            </div>

            <div className="admin-statistics-charts">
              <section className="admin-chart-card">
                <h2>Cơ cấu tài khoản</h2>

                <div className="admin-chart-body">
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={userChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="92%"
                        paddingAngle={3}
                        stroke="none"
                        label={false}
                      >
                        {userChartData.map((_, index) => (
                          <Cell
                            key={`user-${index}`}
                            fill={USER_COLORS[index % USER_COLORS.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>

                  <ChartLegend items={userChartData} colors={USER_COLORS} />
                </div>
              </section>

              <section className="admin-chart-card">
                <h2>Tin tuyển dụng theo trạng thái</h2>

                <div className="admin-chart-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={jobChartData}
                      margin={{ top: 24, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e3e8ee"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={AXIS_TICK}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={AXIS_TICK}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: "rgba(14, 107, 92, 0.06)" }}
                      />
                      <Bar
                        dataKey="soLuong"
                        name="Số lượng tin"
                        maxBarSize={56}
                        radius={[6, 6, 0, 0]}
                      >
                        {jobChartData.map((_, index) => (
                          <Cell
                            key={`job-${index}`}
                            fill={JOB_COLORS[index % JOB_COLORS.length]}
                          />
                        ))}
                        <LabelList
                          dataKey="soLuong"
                          position="top"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            fill: "#1f2a37",
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="admin-chart-card admin-chart-wide">
                <h2>Trạng thái hồ sơ ứng tuyển</h2>

                <div className="admin-chart-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={applicationChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="none"
                        label={false}
                      >
                        {applicationChartData.map((_, index) => (
                          <Cell
                            key={`application-${index}`}
                            fill={
                              APPLICATION_COLORS[
                                index % APPLICATION_COLORS.length
                              ]
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>

                  <ChartLegend
                    items={applicationChartData}
                    colors={APPLICATION_COLORS}
                  />
                </div>
              </section>
            </div>

            <section className="admin-statistics-extra">
              <h2>Chỉ số cần theo dõi</h2>

              <p>
                <span>Tài khoản bị khóa</span>
                <strong>{statistics.users.locked}</strong>
              </p>

              <p>
                <span>Tin tuyển dụng đang bị ẩn</span>
                <strong>{statistics.jobs.hidden}</strong>
              </p>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;