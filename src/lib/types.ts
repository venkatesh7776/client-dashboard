export type Client = {
  id: string;
  client_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  expected_value: number | null;
  follow_up_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  project_code: string;
  client_id: string;
  client_code: string;
  client_name: string;
  name: string;
  start_date: string;
  deadline: string;
  priority: string;
  status: string;
  value: number | null;
  notes: string | null;
  duration_days: number;
  days_until_start: number | null;
  days_left: number;
  timeline_tag: string | null;
};

export type Payment = {
  id: string;
  payment_code: string;
  client_id: string;
  amount: number;
  payment_date: string;
  month: string;
  mode: string | null;
  notes: string | null;
  clients: { client_code: string; name: string } | null;
};

export type Todo = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  is_done: boolean;
  done_at: string | null;
  sort_order: number;
  project_id: string | null;
  notes: string | null;
  projects: { project_code: string; name: string } | null;
};

export type Option = { value: string; label: string };

export type MonthRow = { month: string; total: number; count: number };
