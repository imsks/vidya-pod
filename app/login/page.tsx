import type { Metadata } from "next";
import { LoginPage } from "@/components/login-page";

export const metadata: Metadata = {
  title: "Login — Vidya Pods",
};

export default function Page() {
  return <LoginPage />;
}
