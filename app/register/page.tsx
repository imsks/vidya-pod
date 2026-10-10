import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register - Vidya Pods",
  description: "Register as a Teacher, Student, or Proctor to join the Vidya Pods movement.",
};
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin");
}
