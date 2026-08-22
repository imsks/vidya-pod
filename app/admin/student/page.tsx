import type { Metadata } from "next";
import { AdminEntityUploadPage } from "@/components/admin-entity-upload-page";

export const metadata: Metadata = {
  title: "Add Student — Vidya Pods Admin",
  description: "Admin page to add a student",
};

export default function Page() {
  return <AdminEntityUploadPage entityType="student" />;
}
