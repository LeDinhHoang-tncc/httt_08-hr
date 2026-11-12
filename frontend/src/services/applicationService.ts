
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
  cover_letter: string | null;
  resume_url: string | null;
  original_filename: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationListResponse {
  items: Application[];
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