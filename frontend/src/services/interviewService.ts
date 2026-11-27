import type {
  InterviewSession,
  InterviewSessionCreate,
  InterviewSessionListResponse,
  CandidateInterviewSessionListResponse,
  InterviewStatus,
} from "../types/interview";

const API_URL = "http://127.0.0.1:8000/api";

export type InterviewResult = "accepted" | "rejected" | "next_round";

export interface InterviewEvaluation {
  application_id: number;
  result: InterviewResult;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}


// Xử lý lỗi API
async function handleError(response: Response, defaultMessage: string) {
  const errorData = await response.json().catch(() => null);
  const detail = errorData?.detail;

  let message = defaultMessage;

  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail
      .map((item) => {
        if (typeof item === "string") return item;
        const msg = item?.msg || item?.message || "";
        return msg.replace(/^Value error,\s*/i, "");
      })
      .filter(Boolean)
      .join("\n");
  } else if (detail && typeof detail === "object") {
    message = detail.msg || detail.message || defaultMessage;
  }

  throw new Error(message);
}


// Recruiter lấy danh sách lịch phỏng vấn
export async function getMyInterviewSessions(params?: {
  page?: number;
  pageSize?: number;
}): Promise<InterviewSessionListResponse> {
  const query = new URLSearchParams();

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/interviews?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể tải danh sách lịch phỏng vấn.");
  }

  return response.json();
}

// Candidate lấy danh sách lịch phỏng vấn của mình
export async function getCandidateInterviewSessions(params?: {
  page?: number;
  pageSize?: number;
}): Promise<CandidateInterviewSessionListResponse> {
  const query = new URLSearchParams();

  query.append("page", String(params?.page ?? 1));
  query.append("page_size", String(params?.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/interviews/my?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể tải lịch phỏng vấn của bạn.");
  }

  return response.json();
}

// Recruiter tạo lịch phỏng vấn
export async function createInterviewSession(
  data: InterviewSessionCreate
): Promise<InterviewSession> {
  const response = await fetch(`${API_URL}/interviews`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleError(response, "Không thể tạo lịch phỏng vấn.");
  }

  return response.json();
}

// Recruiter hủy toàn bộ buổi phỏng vấn
export async function cancelInterviewSession(
  sessionId: number
): Promise<{
  message: string;
  id: number;
  status: InterviewStatus;
}> {
  const response = await fetch(
    `${API_URL}/interviews/${sessionId}/cancel`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể hủy lịch phỏng vấn.");
  }

  return response.json();
}

// Recruiter hủy lịch của một ứng viên trong nhóm
export async function cancelCandidateInterview(
  sessionId: number,
  applicationId: number
): Promise<{
  message: string;
  session_id: number;
  application_id: number;
  application_status: InterviewStatus;
  session_status: InterviewStatus;
}> {
  const response = await fetch(
    `${API_URL}/interviews/${sessionId}/applications/${applicationId}/cancel`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể hủy lịch của ứng viên.");
  }

  return response.json();
}

// Recruiter dời lịch cho một hoặc nhiều ứng viên
export async function rescheduleInterviewSession(
  sessionId: number,
  data: InterviewSessionCreate
): Promise<InterviewSession> {
  const response = await fetch(
    `${API_URL}/interviews/${sessionId}/reschedule`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể dời lịch phỏng vấn.");
  }

  return response.json();
}

// Recruiter đánh giá một ứng viên
export async function completeCandidateInterview(
  sessionId: number,
  applicationId: number,
  result: InterviewResult
): Promise<{
  message: string;
  session_id: number;
  application_id: number;
  application_status: string;
  interview_status: InterviewStatus;
  session_status: InterviewStatus;
}> {
  const response = await fetch(
    `${API_URL}/interviews/${sessionId}/applications/${applicationId}/complete`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ result }),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể đánh giá ứng viên.");
  }

  return response.json();
}

// Recruiter đánh giá toàn bộ ứng viên còn lịch trong buổi phỏng vấn
export async function completeInterviewSession(
  sessionId: number,
  evaluations: InterviewEvaluation[]
): Promise<{
  message: string;
  id: number;
  status: InterviewStatus;
}> {
  const response = await fetch(
    `${API_URL}/interviews/${sessionId}/complete`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ evaluations }),
    }
  );

  if (!response.ok) {
    await handleError(response, "Không thể hoàn thành buổi phỏng vấn.");
  }

  return response.json();
}