import type { AdminDashboardStatistics } from "../types/admin";

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: "candidate" | "recruiter" | "admin";
  is_active: boolean;
  recruiter_status: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

const API_URL = "http://127.0.0.1:8000/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

// Lấy danh sách tài khoản
export async function getAdminUsers(params?: {
  keyword?: string;
  role?: "candidate" | "recruiter" | "admin";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();

  if (params?.keyword) {
    query.append("keyword", params.keyword);
  }

  if (params?.role) {
    query.append("role", params.role);
  }

  if (params?.isActive !== undefined) {
    query.append("is_active", String(params.isActive));
  }

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/admin/users?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể tải danh sách tài khoản."
    );
  }

  return response.json();
}

// Khóa hoặc mở khóa tài khoản
export async function updateUserStatus(
  userId: number,
  isActive: boolean
): Promise<AdminUser> {
  const response = await fetch(
    `${API_URL}/admin/users/${userId}/status`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: isActive }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể cập nhật trạng thái tài khoản."
    );
  }

  return response.json();
}


// Lấy danh sách yêu cầu đăng ký Recruiter đang chờ duyệt
export async function getRecruiterRequests(
  params?: {
    page?: number;
    pageSize?: number;
  }
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/admin/recruiter-requests?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể tải danh sách yêu cầu Recruiter."
    );
  }

  return response.json();
}

// Phê duyệt hoặc từ chối yêu cầu Recruiter
export async function reviewRecruiterRequest(
  userId: number,
  approved: boolean
): Promise<AdminUser> {
  const response = await fetch(
    `${API_URL}/admin/users/${userId}/recruiter-review`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approved }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể xử lý yêu cầu Recruiter."
    );
  }

  return response.json();
}

// Lấy số liệu tổng quan Admin Dashboard
export async function getAdminDashboardStatistics(): Promise<AdminDashboardStatistics> {
  const response = await fetch(`${API_URL}/admin/dashboard`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể tải thống kê tổng quan."
    );
  }

  return response.json();
}