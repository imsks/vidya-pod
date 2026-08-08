export type UserRole = "admin" | "teacher" | "student" | "proctor" | "donor";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  qualification?: string;
  standard?: string;
  imageUrl?: string;
  hasAppAccess?: boolean;
}

export interface Pod {
  id: string;
  name: string;
  code: string;
  location: string;
  description?: string;
  created_by?: string;
  status: "ACTIVE" | "INACTIVE" | "PAUSED";
  created_at: string;
}

export interface PodMembership {
  id: string;
  pod_id: string;
  member_id: string;
  role: UserRole;
  assigned_at: string;
  member_details?: AuthUser;
}

export interface AttendanceRecord {
  id: string;
  pod_id: string;
  student_id: string;
  proctor_id?: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
  notes?: string;
  created_at: string;
  student_name?: string;
}

export interface LearnerFeedback {
  id: string;
  pod_id: string;
  student_id: string;
  author_id: string;
  author_role: "teacher" | "proctor" | "admin";
  feedback_text: string;
  rating?: number;
  created_at: string;
  author_name?: string;
  student_name?: string;
}

export interface DetailedPod extends Pod {
  teachers: AuthUser[];
  proctors: AuthUser[];
  students: AuthUser[];
  donors: AuthUser[];
}
