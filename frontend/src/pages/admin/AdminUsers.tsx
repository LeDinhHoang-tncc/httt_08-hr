import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAdminUsers,
  updateUserStatus,
  type AdminUser,
} from "../../services/adminService";

import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import "./AdminUsers.css";

function AdminUsers() {
    const { user } = useAuth();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Tài khoản đang chờ người dùng xác nhận khóa / mở khóa
    const [pendingToggle, setPendingToggle] = useState<AdminUser | null>(null);

    const [keyword, setKeyword] = useState("");
    const [role, setRole] = useState("");
    const [isActive, setIsActive] = useState("");

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError("");

            const result = await getAdminUsers({
                keyword: keyword.trim() || undefined,
                role: role
                ? (role as "candidate" | "recruiter" | "admin")
                : undefined,
                isActive:
                isActive === "" ? undefined : isActive === "true",
                page,
                pageSize,
            });

            setUsers(result.items);
            setTotal(result.total);
        } catch (err) {
        setError(
            err instanceof Error
            ? err.message
            : "Không thể tải danh sách tài khoản."
        );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [page]);

    const handleToggleStatus = async (item: AdminUser) => {
    const newStatus = !item.is_active;

    try {
        setError("");

        const updatedUser = await updateUserStatus(
            item.id,
            newStatus
        );

        setUsers((prevUsers) =>
            prevUsers.map((currentUser) =>
                currentUser.id === item.id
                ? updatedUser
                : currentUser
            )
        );
        } catch (err) {
            setError(
            err instanceof Error
                ? err.message
                : "Không thể cập nhật trạng thái tài khoản."
            );
        }
    };

const handleConfirmToggle = async () => {
        if (!pendingToggle) return;

        const target = pendingToggle;
        setPendingToggle(null);

        await handleToggleStatus(target);
    };

return (
    <main className="admin-users">
        <h1>Quản lý tài khoản</h1>
            <Link
                to="/admin/dashboard"
                className="btn-back-dashboard"
                >
                ← Quay về Dashboard Admin
            </Link>
            {loading && <p>Đang tải danh sách tài khoản...</p>}
            {error && <p>{error}</p>}

                <div className="user-filters">
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc email..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />

            <select
                value={role}
                onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
                }}
            >
                <option value="">Tất cả vai trò</option>
                <option value="candidate">Ứng viên</option>
                <option value="recruiter">Nhà tuyển dụng</option>
                <option value="admin">Admin</option>
            </select>

            <select
                value={isActive}
                onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
                }}
            >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã khóa</option>
            </select>

            <button
                type="button"
                onClick={() => {
                setPage(1);
                loadUsers();
                }}
            >
                Tìm kiếm
            </button>
        </div>

        <div className="user-list">
            <h2>Danh sách tài khoản ({total})</h2>

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : users.length === 0 ? (
                <p>Không tìm thấy tài khoản nào.</p>
            ) : (
                <table>
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Trạng thái duyệt</th>
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
                        <td>
                        {item.is_active ? "Đang hoạt động" : "Đã khóa"}
                        </td>
                        <td>{item.recruiter_status}</td>
                        <td>
                        {item.role !== "admin" && item.id !== user?.id && (
                            <button
                                type="button"
                                onClick={() => setPendingToggle(item)}
                                >
                                {item.is_active ? "Khóa" : "Mở khóa"}
                            </button>
                        )}
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
            )}
        </div>
        <ConfirmDialog
            open={pendingToggle !== null}
            variant={pendingToggle?.is_active ? "danger" : "default"}
            title={
                pendingToggle?.is_active
                    ? "Khóa tài khoản?"
                    : "Mở khóa tài khoản?"
            }
            message={`Bạn có chắc chắn muốn ${
                pendingToggle?.is_active ? "khóa" : "mở khóa"
            } tài khoản ${pendingToggle?.full_name ?? ""}?`}
            confirmText={pendingToggle?.is_active ? "Khóa" : "Mở khóa"}
            onConfirm={handleConfirmToggle}
            onCancel={() => setPendingToggle(null)}
        />
    </main>
  );
}

export default AdminUsers;