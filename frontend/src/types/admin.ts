export interface AdminDashboardStatistics {
  users: {
    total: number;
    candidates: number;
    recruiters: number;
    admins: number;
    locked: number;
  };

  jobs: {
    total: number;
    draft: number;
    published: number;
    completed: number;
    hidden: number;
  };

  applications: {
    total: number;
    submitted: number;
    reviewing: number;
    interview: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  };

  pending_recruiters: number;
}
