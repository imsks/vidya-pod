import type { Metadata } from "next";
import { RegisterPage } from "@/components/register-page";

export const metadata: Metadata = {
  title: "Register — Vidya Pods",
  description: "Register as a Teacher, Student, or Proctor to join the Vidya Pods movement.",
};

export default function Page() {
  return <RegisterPage />;
}
