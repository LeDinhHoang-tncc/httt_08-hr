import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    getAllApplications,
    unhideApplication,
} from "../../services/applicationService";

import type {
    AdminApplication,
} from "../../services/applicationService";

import "./AdminApplications.css";

function AdminApplications() {
    const [applications, setApplications] = useState<AdminApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [keywordInput, setKeywordInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [hiddenFilter, setHiddenFilter] = useState("all");
    const pageSize = 10;
    const handleUnhide = async (applicationId: number) => {
        const confirmed = window.confirm(
            "Bạn có chắc muốn khôi phục hồ sơ ứng tuyển này?"
        );

        if (!confirmed) return;

        try {
            setError("");

            await unhideApplication(applicationId);

            setApplications((previous) =>
            previous.map((application) =>
                application.id === applicationId
                ? { ...application, hidden_by_candidate: false }
                : application
            )
            );
        } catch (err) {
            setError(
            err instanceof Error
                ? err.message
                : "Không thể khôi phục hồ sơ ứng tuyển."
            );
        }
    };
    useEffect(() => {
        const loadApplications = async () => {
            try {
                setLoading(true);
                setError("");

                const data = await getAllApplications({
                    page,
                    pageSize,
                    keyword: keyword.trim() || undefined,
                    hiddenByCandidate:
                        hiddenFilter === "all"
                            ? undefined
                            : hiddenFilter === "true",
                });

                setApplications(data.items);
                setTotal(data.total);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Không thể tải danh sách hồ sơ ứng tuyển."
                );
            } finally {
                setLoading(false);
            }
        };

        loadApplications();
    }, [page, keyword, hiddenFilter]);
        //
        return (
        <main className="admin-applications">
            <h1>Quản lý hồ sơ ứng tuyển</h1>

            <Link to="/admin/dashboard">
            Quay lại Dashboard Admin
            </Link>

            <div className="admin-application-filters">
                <form onSubmit={(event) => { event.preventDefault(); setPage(1); setKeyword(keywordInput.trim()); }}>
                    <input type="text" value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Tìm tên, email ứng viên hoặc tin tuyển dụng..."/>
                    <button type="submit"> Tìm kiếm </button>
                </form>

                <select value={hiddenFilter} onChange={(event) => { setPage(1); setHiddenFilter(event.target.value); }}>
                    <option value="all">Tất cả hồ sơ</option>
                    <option value="false">Đang hiển thị</option>
                    <option value="true">Đã bị ẩn</option>
                </select>
            </div>

            {loading && <p>Đang tải danh sách hồ sơ...</p>}

            {error && <p className="error-message">{error}</p>}

            {!loading && !error && applications.length === 0 && (
            <p>Chưa có hồ sơ ứng tuyển nào.</p>
            )}

            {!loading && !error && applications.length > 0 && (
            <div className="admin-application-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID hồ sơ</th>
                            <th>Ứng viên</th>
                            <th>Tin tuyển dụng</th>
                            <th>Trạng thái</th>
                            <th>Trạng thái ẩn</th>
                            <th>Ngày ứng tuyển</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map((application) => (
                            <tr key={application.id}>
                            <td>{application.id}</td>

                            <td>
                                <strong>{application.candidate_name}</strong>
                                <p>{application.candidate_email}</p>
                            </td>

                            <td>
                                <strong>{application.job_title}</strong>
                                <p>{application.company_name}</p>
                            </td>

                            <td>{application.status}</td>

                            <td>
                                {application.hidden_by_candidate ? (
                                    <>
                                        <span>Đã bị xóa</span>
                                        <button
                                            type="button"
                                            onClick={() => handleUnhide(application.id)}
                                        >
                                            Khôi phục
                                        </button>
                                    </>
                                ) : (
                                    "Đang hiển thị"
                                )}
                            </td>

                            <td>
                                {new Date(application.created_at).toLocaleDateString("vi-VN")}
                            </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}

            <div className="admin-pagination">
            <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((previous) => previous - 1)}
            >
                Trang trước
            </button>

            <span>
                Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>

            <button
                type="button"
                disabled={page >= Math.ceil(total / pageSize) || loading}
                onClick={() => setPage((previous) => previous + 1)}
            >
                Trang sau
            </button>
            </div>
        </main>
    );
}

export default AdminApplications;