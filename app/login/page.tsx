"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types/rbac";

const ROLES: { key: UserRole; label: string; icon: string; desc: string; placeholder: string; passRequired: boolean }[] = [
  {
    key: "admin",
    label: "Admin",
    icon: "🔐",
    desc: "Manage PODs, Assign Roles & View Stats",
    placeholder: "Enter Username (e.g. sachin)",
    passRequired: true,
  },
  {
    key: "teacher",
    label: "Teacher",
    icon: "🧑‍🏫",
    desc: "View Assigned PODs & Log Progress",
    placeholder: "Enter Phone Number or Name",
    passRequired: false,
  },
  {
    key: "proctor",
    label: "Proctor",
    icon: "🛡️",
    desc: "Onboard Learners & Manage Attendance",
    placeholder: "Enter Phone Number or Name",
    passRequired: false,
  },
  {
    key: "student",
    label: "Learner",
    icon: "🧒",
    desc: "View Attendance & Teacher Notes",
    placeholder: "Enter Registered Phone or Name",
    passRequired: false,
  },
  {
    key: "donor",
    label: "Donor",
    icon: "💛",
    desc: "Track Sponsored PODs & Impact",
    placeholder: "Enter Registered Email or Phone",
    passRequired: false,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRoleConfig = ROLES.find((r) => r.key === selectedRole)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(selectedRole, identifier, password);

    if (result.success) {
      router.push("/admin");
    } else {
      setError(result.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold text-xl"
          >
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            Vidya Pods
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Register Profile →
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 w-full my-auto">
        <div className="text-center mb-8">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
            Role-Based Access Control
          </div>
          <h1 className="text-3xl font-black font-display">Portal Login</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Select your role and sign in with your registered credentials.
          </p>
        </div>

        {/* Role Selector Pills */}
        <div className="grid grid-cols-5 gap-2 mb-8 bg-muted/60 p-1.5 rounded-2xl border border-border">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setSelectedRole(r.key);
                setError("");
              }}
              className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all ${
                selectedRole === r.key
                  ? "bg-card text-foreground shadow-lift border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xl mb-1">{r.icon}</span>
              <span className="text-xs font-bold truncate w-full text-center">
                {r.label}
              </span>
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 rounded-3xl bg-card border border-border shadow-lift space-y-5"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <span className="text-3xl">{activeRoleConfig.icon}</span>
            <div>
              <div className="font-bold text-base">
                Sign in as {activeRoleConfig.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeRoleConfig.desc}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Identifier
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={activeRoleConfig.placeholder}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          {activeRoleConfig.passRequired && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-3.5 font-bold shadow-glow hover:shadow-lift transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? "Authenticating..." : `Sign In as ${activeRoleConfig.label} →`}
          </button>
        </form>
      </main>

      <footer className="py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        Vidya Pods RBAC Authentication System
      </footer>
    </div>
  );
}
