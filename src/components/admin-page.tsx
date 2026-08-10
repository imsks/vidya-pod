"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AdminDashboard } from "@/components/dashboards/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboards/teacher-dashboard";
import { ProctorDashboard } from "@/components/dashboards/proctor-dashboard";
import { LearnerDashboard } from "@/components/dashboards/learner-dashboard";
import { DonorDashboard } from "@/components/dashboards/donor-dashboard";

export function AdminPage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-lift text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-hero flex items-center justify-center text-3xl shadow-glow">
            🔐
          </div>
          <div>
            <h1 className="text-2xl font-black font-display">Portal Access Required</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Please sign in with your role credentials to access your dashboard.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full rounded-xl bg-gradient-hero text-primary-foreground py-3.5 font-bold shadow-glow hover:shadow-lift transition-all"
          >
            Go to Multi-Role Login Portal →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            <span className="font-display font-bold text-xl">Vidya Pods</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold">{user.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Role: {user.role}
              </span>
            </div>

            {user.role === "admin" && (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero text-primary-foreground px-4 py-2 text-xs font-semibold hover:shadow-lift transition-all"
              >
                + Register User
              </Link>
            )}

            <button
              onClick={logout}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full border border-border"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {user.role === "admin" && <AdminDashboard user={user} />}
        {user.role === "teacher" && <TeacherDashboard user={user} />}
        {user.role === "proctor" && <ProctorDashboard user={user} />}
        {user.role === "student" && <LearnerDashboard user={user} />}
        {user.role === "donor" && <DonorDashboard user={user} />}
      </main>
    </div>
  );
}
