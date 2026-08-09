export const APP_ROLES = [
  "admin",
  "teacher",
  "student",
  "donor",
  "proctor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Learner",
  donor: "Donor",
  proctor: "Proctor",
};

export const REGISTRATION_ROLES = [
  {
    key: "teacher",
    icon: "🧑‍🏫",
    title: "Teacher",
    description: "Teach a pod of kids 3–5 days a week",
  },
  {
    key: "student",
    icon: "🧒",
    title: "Learner",
    description: "Join a pod and learn with friends",
  },
  {
    key: "proctor",
    icon: "🛡️",
    title: "Proctor",
    description: "Manage pods, coordinate with parents",
  },
] as const;

export type RegistrationRole = (typeof REGISTRATION_ROLES)[number]["key"];