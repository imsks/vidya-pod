export interface TeacherRecord {
  id?: string;
  name: string;
  phone: string;
  qualification?: string;
  image_url?: string | null;
  created_at?: string;
}

export interface LearnerRecord {
  id?: string;
  name: string;
  phone?: string | null;
  standard?: string;
  image_url?: string | null;
  sponsor_id?: string | null;
  sponsorship_ends_at?: string | null;
  created_at?: string;
}

export interface ProctorRecord {
  id?: string;
  name: string;
  phone: string;
  qualification?: string;
  image_url?: string | null;
  created_at?: string;
}

export interface SponsorRecord {
  id?: string;
  name: string;
  email: string;
  phone: string;
  organization?: string | null;
  image_url?: string | null;
  learner_count: number;
  order_count: number;
  created_at?: string;
}

export interface SponsorOrderRecord {
  id?: string;
  order_id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  amount: number;
  status: string;
  payment_session_id?: string | null;
  learner_id?: string | null;
  learner_name?: string | null;
  created_at?: string;
}

export interface AdminDashboardData {
  teachers: TeacherRecord[];
  learners: LearnerRecord[];
  proctors: ProctorRecord[];
  sponsors: SponsorRecord[];
  sponsor_orders: SponsorOrderRecord[];
}
