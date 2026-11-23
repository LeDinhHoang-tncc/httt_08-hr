export interface Job {
  id: number;
  title: string;
  company_name: string;
  description: string;
  requirements: string | null;
  location: string;
  employment_type: string;
  salary_min: string | null;
  salary_max: string | null;
  status: string;
  is_hidden: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}