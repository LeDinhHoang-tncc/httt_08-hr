import type { Job } from "../types/job";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "interview"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: number;
  user_id: number;
  job_id: number;
  status: ApplicationStatus;
  hidden_by_candidate: boolean;
  cover_letter: string | null;
  resume_url: string | null;
  original_filename: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminApplication {
  id: number;
  user_id: number;
  job_id: number;
  status: ApplicationStatus;
  hidden_by_candidate: boolean;

  candidate_name: string;
  candidate_email: string;

  job_title: string;
  company_name: string;

  created_at: string;
}

export interface AdminApplicationListResponse {
  items: AdminApplication[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApplicationListResponse {
  items: Application[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReceivedApplication extends Application {
  candidate: {
    full_name: string;
    email: string;
  };
  job: {
    title: string;
    company_name: string;
  };
}

export interface ReceivedApplicationListResponse {
  items: ReceivedApplication[];
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

// Lấy danh sách đơn ứng tuyển của ứng viên
export async function getMyApplications(): Promise<ApplicationListResponse> {
  const response = await fetch(`${API_URL}/applications`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Không thể tải danh sách đơn ứng tuyển.");
  }

  return response.json();
}

// Lấy danh sách đơn ứng tuyển nhà tuyển dụng nhận được
export async function getReceivedApplications(params?: {
  jobId?: number;
  applicationStatus?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}): Promise<ReceivedApplicationListResponse> {
  const query = new URLSearchParams();

  if (params?.jobId !== undefined) {
    query.append("job_id", String(params.jobId));
  }

  if (params?.applicationStatus) {
    query.append("application_status", params.applicationStatus);
  }

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/applications/received?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể tải danh sách hồ sơ ứng tuyển."
    );
  }

  return response.json();
}

// Lấy chi tiết một đơn ứng tuyển
export async function getApplicationById(
  applicationId: number
): Promise<Application> {
  const response = await fetch(
    `${API_URL}/applications/${applicationId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Không thể tải chi tiết đơn ứng tuyển.");
  }

  return response.json();
}

// Lấy thông tin công việc
export async function getJobById(jobId: number): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Không thể tải thông tin công việc.");
  }

  return response.json();
}

// Tải CV của đơn ứng tuyển
export async function downloadApplicationCV(
  applicationId: number
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/applications/${applicationId}/cv`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Không thể tải CV.");
  }

  return response.blob();
}

// Chỉnh sửa đơn ứng tuyển
export async function updateApplication(
  applicationId: number,
  data: {
    coverLetter?: string;
    cvFile?: File;
  }
): Promise<Application> {
  const formData = new FormData();

  if (data.coverLetter !== undefined) {
    formData.append("cover_letter", data.coverLetter);
  }

  if (data.cvFile) {
    formData.append("cv_file", data.cvFile);
  }

  const response = await fetch(
    `${API_URL}/applications/${applicationId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Không thể chỉnh sửa đơn ứng tuyển.");
  }

  return response.json();
}

// Rút đơn ứng tuyển
export async function withdrawApplication(
  applicationId: number
): Promise<Application> {
  const response = await fetch(
    `${API_URL}/applications/${applicationId}/withdraw`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Không thể rút đơn ứng tuyển.");
  }

  return response.json();
}


// Nộp hồ sơ ứng tuyển hoặc ứng tuyển lại
export async function createApplication(data: {
  jobId: number;
  coverLetter?: string;
  cvFile: File;
}): Promise<Application> {
  const formData = new FormData();

  formData.append("job_id", String(data.jobId));
  formData.append("cover_letter", data.coverLetter || "");
  formData.append("cv_file", data.cvFile);

  const response = await fetch(`${API_URL}/applications`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể nộp hồ sơ ứng tuyển."
    );
  }

  return response.json();
}

// Xóa mềm đơn ứng tuyển
export async function hideApplication(
  applicationId: number
): Promise<Application> {
  const response = await fetch(
    `${API_URL}/applications/${applicationId}/hide`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể xóa đơn ứng tuyển."
    );
  }

  return response.json();
}


// Nhà tuyển dụng cập nhật trạng thái đơn ứng tuyển
export async function updateApplicationStatus(
  applicationId: number,
  status: "reviewing" | "interview" | "accepted" | "rejected"
): Promise<Application> {
  const response = await fetch(
    `${API_URL}/applications/${applicationId}/status`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể cập nhật trạng thái hồ sơ."
    );
  }

  return response.json();
}

// Admin lấy danh sách toàn bộ hồ sơ ứng tuyển
export async function getAllApplications(params?: {
  jobId?: number;
  applicationStatus?: ApplicationStatus;
  keyword?: string;
  hiddenByCandidate?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<AdminApplicationListResponse> {
  const query = new URLSearchParams();

  if (params?.jobId !== undefined) {
    query.append("job_id", String(params.jobId));
  }

  if (params?.applicationStatus) {
    query.append("application_status", params.applicationStatus);
  }
  if (params?.keyword) {
    query.append("keyword", params.keyword);
  }

  if (params?.hiddenByCandidate !== undefined) {
    query.append(
      "hidden_by_candidate",
      String(params.hiddenByCandidate)
    );
  }

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/applications/admin?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể tải toàn bộ hồ sơ ứng tuyển."
    );
  }

  return response.json();
}

// Admin khôi phục hồ sơ ứng tuyển đã bị ứng viên ẩn
export async function unhideApplication(
  applicationId: number
): Promise<Application> {
  const response = await fetch(
    `${API_URL}/applications/${applicationId}/unhide`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Không thể khôi phục hồ sơ ứng tuyển."
    );
  }

  return response.json();
}