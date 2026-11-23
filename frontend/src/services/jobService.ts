import type { Job } from "../types/job";

const API_URL = "http://127.0.0.1:8000/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

// Lấy danh sách tin tuyển dụng do nhà tuyển dụng quản lý
export async function getManagedJobs(params?: {
  keyword?: string;
  jobStatus?: "draft" | "published" | "completed";
  isHidden?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<Job[]> {
  const query = new URLSearchParams();

  if (params?.keyword) {
    query.append("keyword", params.keyword);
  }

  if (params?.jobStatus) {
    query.append("job_status", params.jobStatus);
  }
  
  if (params?.isHidden !== undefined) {
    query.append("is_hidden", String(params.isHidden));
  }
  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/jobs/manage?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Không thể tải danh sách tin tuyển dụng.");
  }

  return response.json();
}

// Lấy chi tiết tin tuyển dụng
export async function getManagedJobById(
  jobId: number
): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Không thể tải thông tin tin tuyển dụng.");
  }

  return response.json();
}

// Dữ liệu tạo và cập nhật tin tuyển dụng
export interface JobFormData {
  title: string;
  company_name: string;
  description: string;
  requirements: string | null;
  location: string;
  employment_type:
    | "full_time"
    | "part_time"
    | "internship"
    | "contract";
  salary_min: number | null;
  salary_max: number | null;
  status: "draft" | "published";
}

// Tạo tin tuyển dụng
export async function createJob(data: JobFormData): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể tạo tin tuyển dụng."
    );
  }

  return response.json();
}

// Cập nhật tin tuyển dụng
export async function updateJob(
  jobId: number,
  data: Partial<JobFormData>
): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể cập nhật tin tuyển dụng."
    );
  }

  return response.json();
}

// Kết thúc tuyển dụng
export async function completeJob(jobId: number): Promise<Job> {
  const response = await fetch(
    `${API_URL}/jobs/${jobId}/complete`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể kết thúc tuyển dụng."
    );
  }

  return response.json();
}

// Xóa tin tuyển dụng
export async function deleteJob(jobId: number): Promise<void> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể xóa tin tuyển dụng."
    );
  }
}


// Admin: Ẩn tin tuyển dụng
export async function hideJob(jobId: number): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${jobId}/hide`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || "Không thể ẩn tin tuyển dụng."
    );
  }

  return response.json();
}

// Admin: Hiện lại tin tuyển dụng
export async function unhideJob(jobId: number): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${jobId}/unhide`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || "Không thể hiện tin tuyển dụng."
    );
  }

  return response.json();
}

// Admin: Lấy danh sách tin tuyển dụng đã xóa
export async function getDeletedJobs(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<Job[]> {
  const query = new URLSearchParams();

  if (params?.keyword) {
    query.append("keyword", params.keyword);
  }

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/jobs/admin/deleted?${query.toString()}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || "Không thể tải danh sách tin đã xóa."
    );
  }

  return response.json();
}

// Admin: Khôi phục tin tuyển dụng đã xóa
export async function restoreDeletedJob(jobId: number): Promise<Job> {
  const response = await fetch(
    `${API_URL}/jobs/admin/${jobId}/restore`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || "Không thể khôi phục tin tuyển dụng."
    );
  }

  return response.json();
}
