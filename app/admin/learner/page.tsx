import type { Metadata } from "next";
import { UploadLearnerPage } from "@/components/upload-learner-page";

export const metadata: Metadata = {
  title: "Upload Learner — Vidya Pods",
  description: "Admin page to upload learner details",
};

export default function Page() {
  return <UploadLearnerPage />;
}
