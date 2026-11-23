import { useEffect, useState } from "react";
import {
  getRecruiterRequests,
  reviewRecruiterRequest,
  type AdminUser,
} from "../../services/adminService";

import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import "./AdminRecruiterRequests.css";

function AdminRecruiterRequests() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Yêu cầu đang chờ người dùng xác nhận phê duyệt / từ chối
    const [pendingReview, setPendingReview] = useState<{
        user: AdminUser;
        approved: boolean;
    } | null>(null);

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError("");

                const result = await getRecruiterRequests({
                    page,
                    pageSize,
            });

            setUsers(result.items);
            setTotal(result.total);
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : "Không thể tải danh sách yêu cầu Recruiter."
            );
        } finally {
        setLoading(false);
        }
    };

    const handleReview = async (
        user: AdminUser,
        approved: boolean
        ) => {
        try {
            setError("");

            await reviewRecruiterRequest(user.id, approved);

            setUsers((prev) =>
            prev.filter((item) => item.id !== user.id)
            );

            setTotal((prev) => Math.max(0, prev - 1));

            // Nếu trang hiện tại chỉ còn một yêu cầu,
            // chuyển về trang trước để tránh trang trống.
            if (users.length === 1 && page > 1) {
            setPage((prev) => prev - 1);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể xử lý yêu cầu Recruiter."
            );
        }
        };

    useEffect(() => {
        loadRequests();
    }, [page]);

  const handleConfirmReview = async () => {
    if (!pendingReview) return;

    const { user: reviewedUser, approved } = pendingReview;
    setPendingReview(null);

    await handleReview(reviewedUser, approved);
  };

  const reviewVerb = pendingReview?.approved ? "phê duyệt" : "từ chối";

  return (
    <main className="admin-recruiter-requests">
        <h1>Duyệt yêu cầu nhà tuyển dụng</h1>
        <Link
            to="/admin/dashboard"
            className="btn-back-dashboard"
            >
            ← Quay về Dashboard Admin
        </Link>
        {loading && <p>Đang tải danh sách yêu cầu...</p>}
        {error && <p>{error}</p>}


        <div className="recruiter-request-list">
            <h2>Danh sách chờ duyệt ({total})</h2>

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : users.length === 0 ? (
                <p>Hiện không có yêu cầu nào đang chờ duyệt.</p>
            ) : (
            <table>
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Vai trò hiện tại</th>
                    <th>Trạng thái yêu cầu</th>
                    <th>Trạng thái tài khoản</th>
                    <th>Thao tác</th>
                    </tr>
                </thead>

                <tbody>
                    {users.map((item) => (
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.full_name}</td>
                        <td>{item.email}</td>
                        <td>{item.role}</td>
                        <td>{item.recruiter_status}</td>
                        <td>
                            {item.is_active ? "Đang hoạt động" : "Đã khóa"}
                        </td>

                        <td>
                            <button
                                type="button"
                                onClick={() => setPendingReview({ user: item, approved: true })}>
                            Phê duyệt
                            </button>

                            <button
                                type="button"
                                onClick={() => setPendingReview({ user: item, approved: false })}>
                            Từ chối
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        )}
        </div>
        <div className="pagination">
            <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => prev - 1)}>
                Trang trước
            </button>

            <span>
                Trang {page} / {totalPages}
            </span>

            <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => prev + 1)}>
                Trang sau
            </button>
        </div>
        <ConfirmDialog
            open={pendingReview !== null}
            variant={pendingReview?.approved ? "default" : "danger"}
            title={
                pendingReview?.approved
                    ? "Phê duyệt yêu cầu?"
                    : "Từ chối yêu cầu?"
            }
            message={`Bạn có chắc muốn ${reviewVerb} yêu cầu của ${
                pendingReview?.user.full_name ?? ""
            }?`}
            confirmText={pendingReview?.approved ? "Phê duyệt" : "Từ chối"}
            onConfirm={handleConfirmReview}
            onCancel={() => setPendingReview(null)}
        />
    </main>
  );
}

export default AdminRecruiterRequests;