export type InterviewType = "online" | "offline";

export type InterviewStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type InterviewResult =
  | "accepted"
  | "rejected"
  | "next_round";

// Thông tin ứng viên trong lịch phỏng vấn của recruiter
export interface InterviewCandidate {
  application_id: number;
  full_name: string;
  email: string;
  status: InterviewStatus;
}

// Lịch phỏng vấn dành cho recruiter
export interface InterviewSession {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  interview_type: InterviewType;
  location: string | null;
  meeting_url: string | null;
  notes: string | null;
  status: InterviewStatus;
  created_by: number;
  created_at: string;
  candidates: InterviewCandidate[];
}

// Danh sách lịch phỏng vấn của recruiter
export interface InterviewSessionListResponse {
  items: InterviewSession[];
  total: number;
  page: number;
  page_size: number;
}

// Lịch phỏng vấn dành cho candidate
export interface CandidateInterviewSession {
  id: number;
  application_id: number;
  job_title: string;
  company_name: string;
  title: string;
  start_time: string;
  end_time: string;
  interview_type: InterviewType;
  location: string | null;
  meeting_url: string | null;
  notes: string | null;
  status: InterviewStatus;
}

// Danh sách lịch phỏng vấn của candidate
export interface CandidateInterviewSessionListResponse {
  items: CandidateInterviewSession[];
  total: number;
  page: number;
  page_size: number;
}

// Dữ liệu tạo hoặc dời lịch phỏng vấn
export interface InterviewSessionCreate {
  title: string;
  application_ids: number[];
  start_time: string;
  end_time: string;
  interview_type: InterviewType;
  location: string | null;
  meeting_url: string | null;
  notes: string | null;
}
