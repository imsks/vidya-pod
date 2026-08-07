"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

type Tab = "teachers" | "students" | "proctors" | "sponsors";

export function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("teachers");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [proctors, setProctors] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        router.push("/login?redirectTo=/admin");
        return;
      }
      
      // Load admin data
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

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push("/login?redirectTo=/admin");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
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
          <div className="flex items-center gap-4">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero text-primary-foreground px-5 py-2 text-sm font-semibold hover:shadow-lift transition-all"
            >
              + Register User
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Logout
            </button>
          </div>
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
                columns={["Image", "Name", "Phone", "Qualification", "Registered"]}
                rows={teachers.map((t) => [
                  t.image_url || "",
                  t.name,
                  t.phone,
                  t.qualification,
                  new Date(t.created_at).toLocaleDateString("en-IN"),
                ])}
                imageColumn={0}
                emptyMsg="No teachers registered yet"
              />
            )}
            {activeTab === "students" && (
              <DataTable
                columns={["Image", "Name", "Phone", "Standard", "Registered"]}
                rows={students.map((s) => [
                  s.image_url || "",
                  s.name,
                  s.phone,
                  `Class ${s.standard}`,
                  new Date(s.created_at).toLocaleDateString("en-IN"),
                ])}
                imageColumn={0}
                emptyMsg="No students registered yet"
              />
            )}
            {activeTab === "proctors" && (
              <DataTable
                columns={["Image", "Name", "Phone", "Qualification", "Registered"]}
                rows={proctors.map((p) => [
                  p.image_url || "",
                  p.name,
                  p.phone,
                  p.qualification,
                  new Date(p.created_at).toLocaleDateString("en-IN"),
                ])}
                imageColumn={0}
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
  imageColumn,
}: {
  columns: string[];
  rows: string[][];
  emptyMsg: string;
  imageColumn?: number;
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
                  {imageColumn === j ? (
                    cell ? (
                      <img
                        src={cell}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )
                  ) : columns[j] === "Status" ? (
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
