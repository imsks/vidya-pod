"use client";

import { useState, useEffect } from "react";

const ADMIN_ID = "sachin";
const ADMIN_PASSWORD = "sachin";

type Tab = "teachers" | "students" | "proctors" | "sponsors";

export function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("teachers");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [proctors, setProctors] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId === ADMIN_ID && loginPassword === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials");
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTeachers(data.teachers ?? []);
        setStudents(data.students ?? []);
        setProctors(data.proctors ?? []);
        setSponsors(data.sponsors ?? []);
      } catch (err) {
        console.error("Failed to load admin data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm p-8 rounded-3xl bg-card border border-border shadow-lift space-y-5"
        >
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-hero flex items-center justify-center text-2xl shadow-glow">
              🔐
            </div>
            <h1 className="mt-4 text-2xl font-black font-display">
              Admin Login
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vidya Pods Admin Panel
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <input
              type="text"
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Enter your ID"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          {loginError && (
            <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm text-center">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-3 font-bold shadow-glow hover:shadow-lift transition-all"
          >
            Login →
          </button>
        </form>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number; icon: string }[] = [
    { key: "teachers", label: "Teachers", count: teachers.length, icon: "🧑‍🏫" },
    { key: "students", label: "Students", count: students.length, icon: "🧒" },
    { key: "proctors", label: "Proctors", count: proctors.length, icon: "🛡️" },
    {
      key: "sponsors",
      label: "Sponsor Orders",
      count: sponsors.length,
      icon: "💛",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            <span className="font-display font-bold text-xl">
              Vidya Pods Admin
            </span>
          </div>
          <button
            onClick={() => setLoggedIn(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {tabs.map((t) => (
            <div
              key={t.key}
              className="p-5 rounded-2xl bg-card border border-border shadow-soft"
            >
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-2 text-3xl font-black font-display">
                {t.count}
              </div>
              <div className="text-sm text-muted-foreground">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === t.key
                  ? "bg-foreground text-background shadow-soft"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
            {activeTab === "teachers" && (
              <DataTable
                columns={["Name", "Phone", "Qualification", "Registered"]}
                rows={teachers.map((t) => [
                  t.name,
                  t.phone,
                  t.qualification,
                  new Date(t.created_at).toLocaleDateString("en-IN"),
                ])}
                emptyMsg="No teachers registered yet"
              />
            )}
            {activeTab === "students" && (
              <DataTable
                columns={["Name", "Phone", "Standard", "Registered"]}
                rows={students.map((s) => [
                  s.name,
                  s.phone,
                  `Class ${s.standard}`,
                  new Date(s.created_at).toLocaleDateString("en-IN"),
                ])}
                emptyMsg="No students registered yet"
              />
            )}
            {activeTab === "proctors" && (
              <DataTable
                columns={["Name", "Phone", "Qualification", "Registered"]}
                rows={proctors.map((p) => [
                  p.name,
                  p.phone,
                  p.qualification,
                  new Date(p.created_at).toLocaleDateString("en-IN"),
                ])}
                emptyMsg="No proctors registered yet"
              />
            )}
            {activeTab === "sponsors" && (
              <DataTable
                columns={[
                  "Name",
                  "Email",
                  "Phone",
                  "Plan",
                  "Amount",
                  "Status",
                  "Date",
                ]}
                rows={sponsors.map((s) => [
                  s.name,
                  s.email,
                  s.phone,
                  s.plan,
                  `₹${s.amount}`,
                  s.status,
                  new Date(s.created_at).toLocaleDateString("en-IN"),
                ])}
                emptyMsg="No sponsor orders yet"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyMsg,
}: {
  columns: string[];
  rows: string[][];
  emptyMsg: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">{emptyMsg}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th
                key={col}
                className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-4">
                  {columns[j] === "Status" ? (
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        cell === "SUCCESS"
                          ? "bg-accent/20 text-accent"
                          : cell === "FAILED"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-primary/20 text-primary"
                      }`}
                    >
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
