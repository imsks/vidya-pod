import type { Metadata } from "next";
import { AdminEntityUploadPage } from "@/components/admin-entity-upload-page";

export const metadata: Metadata = {
  title: "Add Learner — Vidya Pods Admin",
  description: "Admin page to add a learner",
};

export default function Page() {
  return <AdminEntityUploadPage entityType="learner" />;
}
