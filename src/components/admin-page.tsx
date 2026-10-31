"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clearAdminSessionPin, setAdminSessionPin } from "@/lib/admin-session";
import { isLearnerSponsored } from "@/lib/sponsorship/availability";
import type { AdminEditableEntity } from "@/lib/validation/admin-entity-update";
import type {
  AdminDashboardData,
  LearnerRecord,
  ProctorRecord,
  SponsorOrderRecord,
  SponsorRecord,
  TeacherRecord,
} from "@/types/admin";
import { AdminEntityEditDialog, type EditableRecord } from "./admin-entity-edit-dialog";

type Tab = "teachers" | "learners" | "proctors" | "sponsors" | "sponsor-orders";

type ActionTarget = { entity: AdminEditableEntity; record: EditableRecord };

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

const sponsorshipStatus = (learner: LearnerRecord) => {
  if (!learner.sponsor_id) return "No";
  const endsAt = learner.sponsorship_ends_at ? new Date(learner.sponsorship_ends_at) : null;
  return isLearnerSponsored({ sponsorId: learner.sponsor_id, sponsorshipEndsAt: endsAt })
    ? "Yes"
    : "Lapsed";
};

const ADD_LINKS: { entity: AdminEditableEntity; label: string; tab: Tab }[] = [
  { entity: "teacher", label: "Teacher", tab: "teachers" },
  { entity: "learner", label: "Learner", tab: "learners" },
  { entity: "proctor", label: "Proctor", tab: "proctors" },
];

export function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionPin, setSessionPin] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("teachers");
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [proctors, setProctors] = useState<ProctorRecord[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRecord[]>([]);
  const [sponsorOrders, setSponsorOrders] = useState<SponsorOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<ActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActionTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPin = adminPin.trim();

    if (!trimmedPin) {
      setLoginError("Please enter the admin PIN");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_secret: trimmedPin }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setLoginError(data.error || "Invalid admin PIN");
        return;
      }

      setSessionPin(trimmedPin);
      setAdminSessionPin(trimmedPin);
      setLoggedIn(true);
      setAdminPin("");
    } catch {
      setLoginError("Unable to sign in. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        headers: { "x-admin-secret": sessionPin },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as AdminDashboardData;
      setTeachers(data.teachers ?? []);
      setLearners(data.learners ?? []);
      setProctors(data.proctors ?? []);
      setSponsors(data.sponsors ?? []);
      setSponsorOrders(data.sponsor_orders ?? []);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  }, [sessionPin]);

  useEffect(() => {
    if (!loggedIn) return;
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loggedIn, loadData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/${deleteTarget.entity}/${deleteTarget.record.id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": sessionPin },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setActionError(data.error || "Failed to delete");
        return;
      }

      setDeleteTarget(null);
      await loadData();
    } catch {
      setActionError("Unable to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

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
            <h1 className="mt-4 text-2xl font-black font-display">Admin Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vidya Pods Admin Panel</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Admin PIN</label>
            <input
              type="password"
              required
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Enter admin PIN"
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
            disabled={loginLoading}
            className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-3 font-bold shadow-glow hover:shadow-lift transition-all disabled:opacity-60"
          >
            {loginLoading ? "Signing in..." : "Login →"}
          </button>
        </form>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number; icon: string }[] = [
    { key: "teachers", label: "Teachers", count: teachers.length, icon: "🧑‍🏫" },
    { key: "learners", label: "Learners", count: learners.length, icon: "🧒" },
    { key: "proctors", label: "Proctors", count: proctors.length, icon: "🛡️" },
    { key: "sponsors", label: "Sponsors", count: sponsors.length, icon: "🤝" },
    {
      key: "sponsor-orders",
      label: "Sponsor Orders",
      count: sponsorOrders.length,
      icon: "💛",
    },
  ];

  const addLink = ADD_LINKS.find((link) => link.tab === activeTab);

  const rowActions = (entity: AdminEditableEntity, record: EditableRecord) => (
    <div className="flex gap-2">
      <button
        onClick={() => {
          setActionError("");
          setEditTarget({ entity, record });
        }}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold transition hover:border-primary/40"
      >
        Edit
      </button>
      <button
        onClick={() => {
          setActionError("");
          setDeleteTarget({ entity, record });
        }}
        className="rounded-full border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
      >
        Delete
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            <span className="font-display font-bold text-xl">Vidya Pods Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {ADD_LINKS.map((link) => (
              <Link
                key={link.entity}
                href={`/admin/${link.entity}`}
                className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary/40 transition-all"
              >
                + {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setLoggedIn(false);
                setSessionPin("");
                clearAdminSessionPin();
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {tabs.map((t) => (
            <div key={t.key} className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-2 text-3xl font-black font-display">{t.count}</div>
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

        {addLink && (
          <div className="mb-6">
            <Link
              href={`/admin/${addLink.entity}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:shadow-lift transition-all"
            >
              + Add {addLink.label}
            </Link>
          </div>
        )}

        {actionError && !deleteTarget && (
          <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
            {activeTab === "teachers" && (
              <DataTable
                columns={["Image", "Name", "Phone", "Qualification", "Registered", "Actions"]}
                rows={teachers.map((t) => [
                  t.image_url || "",
                  t.name,
                  t.phone,
                  t.qualification ?? "—",
                  formatDate(t.created_at),
                ])}
                imageColumn={0}
                renderActions={(i) => rowActions("teacher", teachers[i])}
                emptyMsg="No teachers registered yet"
              />
            )}
            {activeTab === "learners" && (
              <DataTable
                columns={[
                  "Image",
                  "Name",
                  "Phone",
                  "Class",
                  "Sponsored",
                  "Sponsored till",
                  "Registered",
                  "Actions",
                ]}
                rows={learners.map((l) => [
                  l.image_url || "",
                  l.name,
                  l.phone || "—",
                  `Class ${l.standard ?? "—"}`,
                  sponsorshipStatus(l),
                  l.sponsorship_ends_at ? formatDate(l.sponsorship_ends_at) : "—",
                  formatDate(l.created_at),
                ])}
                imageColumn={0}
                renderActions={(i) => rowActions("learner", learners[i])}
                emptyMsg="No learners registered yet"
              />
            )}
            {activeTab === "proctors" && (
              <DataTable
                columns={["Image", "Name", "Phone", "Qualification", "Registered", "Actions"]}
                rows={proctors.map((p) => [
                  p.image_url || "",
                  p.name,
                  p.phone,
                  p.qualification ?? "—",
                  formatDate(p.created_at),
                ])}
                imageColumn={0}
                renderActions={(i) => rowActions("proctor", proctors[i])}
                emptyMsg="No proctors registered yet"
              />
            )}
            {activeTab === "sponsors" && (
              <DataTable
                columns={[
                  "Image",
                  "Name",
                  "Email",
                  "Phone",
                  "Organization",
                  "Learners",
                  "Orders",
                  "Joined",
                ]}
                rows={sponsors.map((s) => [
                  s.image_url || "",
                  s.name,
                  s.email,
                  s.phone,
                  s.organization || "—",
                  String(s.learner_count),
                  String(s.order_count),
                  formatDate(s.created_at),
                ])}
                imageColumn={0}
                emptyMsg="No sponsors yet"
              />
            )}
            {activeTab === "sponsor-orders" && (
              <DataTable
                columns={["Name", "Email", "Learner", "Plan", "Amount", "Status", "Date"]}
                rows={sponsorOrders.map((s) => [
                  s.name,
                  s.email,
                  s.learner_name ?? "—",
                  s.plan,
                  `₹${s.amount}`,
                  s.status,
                  formatDate(s.created_at),
                ])}
                emptyMsg="No sponsor orders yet"
              />
            )}
          </div>
        )}
      </main>

      {editTarget && (
        <AdminEntityEditDialog
          entity={editTarget.entity}
          record={editTarget.record}
          sessionPin={sessionPin}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            loadData();
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-5 rounded-3xl border border-border bg-card p-7 shadow-lift">
            <div>
              <h2 className="font-display text-xl font-black">Delete {deleteTarget.entity}?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <strong className="text-foreground">{deleteTarget.record.name}</strong> will be
                permanently removed. This cannot be undone.
              </p>
            </div>

            {actionError && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {actionError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary/40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-destructive px-5 py-2.5 text-sm font-bold text-background transition hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyMsg,
  imageColumn,
  renderActions,
}: {
  columns: string[];
  rows: string[][];
  emptyMsg: string;
  imageColumn?: number;
  renderActions?: (rowIndex: number) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">{emptyMsg}</div>;
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
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-4">
                  {imageColumn === j ? (
                    cell ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cell} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        -
                      </div>
                    )
                  ) : columns[j] === "Status" ? (
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        cell === "SUCCESS"
                          ? "bg-accent/20 text-accent"
                          : cell === "FAILED" || cell === "EXPIRED"
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
              {renderActions && <td className="px-5 py-4">{renderActions(i)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
