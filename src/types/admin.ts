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
  phone: string;
  standard?: string;
  image_url?: string | null;
  sponsor_id?: string | null;
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
  sponsors: SponsorOrderRecord[];
}
