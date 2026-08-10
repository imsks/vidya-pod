"use client";

import React, { useState, useEffect } from "react";
import { AuthUser, DetailedPod, UserRole } from "@/types/rbac";

interface AdminDashboardProps {
  user: AuthUser;
}

interface MemberRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  qualification?: string;
  standard?: string;
  amount?: number;
  plan?: string;
  status?: string;
  has_app_access?: boolean;
  image_url?: string;
  created_at?: string;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [pods, setPods] = useState<DetailedPod[]>([]);
  const [teachers, setTeachers] = useState<MemberRecord[]>([]);
  const [students, setStudents] = useState<MemberRecord[]>([]);
  const [proctors, setProctors] = useState<MemberRecord[]>([]);
  const [sponsors, setSponsors] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showPodModal, setShowPodModal] = useState(false);
  const [newPodName, setNewPodName] = useState("");
  const [newPodLocation, setNewPodLocation] = useState("");
  const [newPodDesc, setNewPodDesc] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState("");
  const [assignRole, setAssignRole] = useState<UserRole>("teacher");
  const [assignMemberId, setAssignMemberId] = useState("");

  const [activeTab, setActiveTab] = useState<
    "pods" | "teachers" | "students" | "proctors" | "donors"
  >("pods");
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(
    null,
  );

  const reloadData = async () => {
    try {
      const [podsRes, adminRes] = await Promise.all([fetch("/api/pods"), fetch("/api/admin")]);

      const podsData = await podsRes.json();
      const adminData = await adminRes.json();

      setPods(podsData.pods || []);
      setTeachers(adminData.teachers || []);
      setStudents(adminData.students || []);
      setProctors(adminData.proctors || []);
      setSponsors(adminData.sponsors || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      try {
        const [podsRes, adminRes] = await Promise.all([fetch("/api/pods"), fetch("/api/admin")]);

        const podsData = await podsRes.json();
        const adminData = await adminRes.json();

        if (isMounted) {
          setPods(podsData.pods || []);
          setTeachers(adminData.teachers || []);
          setStudents(adminData.students || []);
          setProctors(adminData.proctors || []);
          setSponsors(adminData.sponsors || []);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/pods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_pod",
          name: newPodName,
          location: newPodLocation,
          description: newPodDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create POD");

      setStatusMsg({ text: `Successfully created POD: ${newPodName}`, type: "success" });
      setShowPodModal(false);
      setNewPodName("");
      setNewPodLocation("");
      setNewPodDesc("");
      reloadData();
    } catch (err) {
      setStatusMsg({
        text: err instanceof Error ? err.message : "Error creating POD",
        type: "error",
      });
    }
  };

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/pods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_member",
          podId: selectedPodId,
          memberId: assignMemberId,
          role: assignRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign member");

      setStatusMsg({ text: "Member successfully assigned to POD!", type: "success" });
      setShowAssignModal(false);
      reloadData();
    } catch (err) {
      setStatusMsg({
        text: err instanceof Error ? err.message : "Error assigning member",
        type: "error",
      });
    }
  };

  const handleRemoveMember = async (podId: string, memberId: string) => {
    try {
      const res = await fetch(`/api/pods?podId=${podId}&memberId=${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStatusMsg({ text: "Member removed from POD", type: "success" });
        reloadData();
      }
    } catch {
      // ignore
    }
  };

  const candidateList =
    assignRole === "teacher"
      ? teachers
      : assignRole === "student"
        ? students
        : assignRole === "proctor"
          ? proctors
          : sponsors.filter((s) => s.status === "SUCCESS");

  return (
    <div className="space-y-8">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            Admin Master Control — {user.name}
          </div>
          <h2 className="text-2xl font-black font-display">POD Ecosystem Overview</h2>
          <p className="text-sm text-muted-foreground">
            Create Pods, assign teachers/proctors/learners/donors, and monitor overall operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPodModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold shadow-glow hover:shadow-lift transition-all"
          >
            + Create New POD
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90 transition-all"
          >
            🔗 Assign Member
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium flex items-center justify-between ${
            statusMsg.type === "success"
              ? "bg-accent/15 text-accent border border-accent/30"
              : "bg-destructive/15 text-destructive border border-destructive/30"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-1">🏫</div>
          <div className="text-3xl font-black font-display">{pods.length}</div>
          <div className="text-xs text-muted-foreground font-semibold">Active Pods</div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-1">🧑‍🏫</div>
          <div className="text-3xl font-black font-display">{teachers.length}</div>
          <div className="text-xs text-muted-foreground font-semibold">Teachers</div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-1">🧒</div>
          <div className="text-3xl font-black font-display">{students.length}</div>
          <div className="text-xs text-muted-foreground font-semibold">Learners</div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-1">🛡️</div>
          <div className="text-3xl font-black font-display">{proctors.length}</div>
          <div className="text-xs text-muted-foreground font-semibold">Proctors</div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-1">💛</div>
          <div className="text-3xl font-black font-display">{sponsors.length}</div>
          <div className="text-xs text-muted-foreground font-semibold">Donors</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(
          [
            { key: "pods", label: "Pods Ecosystem", icon: "🏫" },
            { key: "teachers", label: "Teachers Directory", icon: "🧑‍🏫" },
            { key: "students", label: "Learners Registry", icon: "🧒" },
            { key: "proctors", label: "Proctors Directory", icon: "🛡️" },
            { key: "donors", label: "Donors & Payments", icon: "💛" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === t.key
                ? "bg-foreground text-background shadow-soft"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-medium">
          Loading POD ecosystem data...
        </div>
      ) : activeTab === "pods" ? (
        <div className="grid md:grid-cols-2 gap-6">
          {pods.length === 0 ? (
            <div className="md:col-span-2 text-center py-16 rounded-3xl border border-dashed border-border bg-card">
              <div className="text-4xl mb-3">🏫</div>
              <h3 className="text-lg font-bold">No PODs Created Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Pods connect Teachers, Proctors, Learners, and Donors together. Create your first
                POD now!
              </p>
              <button
                onClick={() => setShowPodModal(true)}
                className="px-5 py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold shadow-glow"
              >
                + Create First POD
              </button>
            </div>
          ) : (
            pods.map((pod) => (
              <div
                key={pod.id}
                className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-muted text-xs font-mono font-bold mb-1">
                      {pod.code}
                    </span>
                    <h3 className="text-xl font-bold font-display">{pod.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      📍 {pod.location} {pod.description && `• ${pod.description}`}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
                    {pod.status}
                  </span>
                </div>

                {/* POD Members Breakdown */}
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                      <span>🧑‍🏫 Teacher ({pod.teachers.length})</span>
                    </div>
                    {pod.teachers.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        No teacher assigned
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {pod.teachers.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                          >
                            {t.name}
                            <button
                              onClick={() => handleRemoveMember(pod.id, t.id)}
                              className="text-xs hover:text-destructive"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      🛡️ Proctor ({pod.proctors.length})
                    </div>
                    {pod.proctors.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        No proctor assigned
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {pod.proctors.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-semibold"
                          >
                            {p.name}
                            <button
                              onClick={() => handleRemoveMember(pod.id, p.id)}
                              className="text-xs hover:text-destructive"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      🧒 Learners ({pod.students.length})
                    </div>
                    {pod.students.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        No learners assigned
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {pod.students.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-medium border border-border"
                          >
                            {s.name} (Class {s.standard})
                            {s.hasAppAccess === false && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.2 rounded-full font-bold">
                                Offline
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveMember(pod.id, s.id)}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedPodId(pod.id);
                      setShowAssignModal(true);
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    + Assign Member to POD
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Registry Table */
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border font-bold text-base flex items-center justify-between">
            <span>
              {activeTab === "teachers" && "Teachers Roster"}
              {activeTab === "students" && "Learners Roster"}
              {activeTab === "proctors" && "Proctors Roster"}
              {activeTab === "donors" && "Sponsorship Orders"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase font-bold text-muted-foreground">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Detail</th>
                  {activeTab === "students" && <th className="px-5 py-3">App Access</th>}
                  {activeTab === "donors" && <th className="px-5 py-3">Plan / Status</th>}
                  <th className="px-5 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(activeTab === "teachers"
                  ? teachers
                  : activeTab === "students"
                    ? students
                    : activeTab === "proctors"
                      ? proctors
                      : sponsors
                ).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-bold flex items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {item.name?.slice(0, 1) || "U"}
                        </div>
                      )}
                      {item.name}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {item.phone || item.email || "—"}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {item.qualification ||
                        (item.standard ? `Class ${item.standard}` : `₹${item.amount || 0}`)}
                    </td>
                    {activeTab === "students" && (
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.has_app_access !== false
                              ? "bg-accent/15 text-accent"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {item.has_app_access !== false
                            ? "Online (App Login)"
                            : "Offline (Proctor Onboarded)"}
                        </span>
                      </td>
                    )}
                    {activeTab === "donors" && (
                      <td className="px-5 py-4">
                        <span className="capitalize font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary mr-2">
                          {item.plan}
                        </span>
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">
                          {item.status}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create POD */}
      {showPodModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePod}
            className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-lift space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xl font-bold font-display">Create New POD</h3>
              <button
                type="button"
                onClick={() => setShowPodModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">POD Name</label>
              <input
                type="text"
                required
                value={newPodName}
                onChange={(e) => setNewPodName(e.target.value)}
                placeholder="e.g. Vidya Pod Sunshine"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Location / Area</label>
              <input
                type="text"
                required
                value={newPodLocation}
                onChange={(e) => setNewPodLocation(e.target.value)}
                placeholder="e.g. Sector 14, Gurugram"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description (Optional)</label>
              <textarea
                rows={3}
                value={newPodDesc}
                onChange={(e) => setNewPodDesc(e.target.value)}
                placeholder="Brief details about this learning pod"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPodModal(false)}
                className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold shadow-glow"
              >
                Create POD →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Assign Member to POD */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignMember}
            className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-lift space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xl font-bold font-display">Assign Member to POD</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Select Target POD</label>
              <select
                required
                value={selectedPodId}
                onChange={(e) => setSelectedPodId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Choose a POD --</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Role to Assign</label>
              <select
                value={assignRole}
                onChange={(e) => {
                  setAssignRole(e.target.value as UserRole);
                  setAssignMemberId("");
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="teacher">Teacher</option>
                <option value="proctor">Proctor</option>
                <option value="student">Learner (Student)</option>
                <option value="donor">Donor (Sponsor)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Select Registered Person</label>
              <select
                required
                value={assignMemberId}
                onChange={(e) => setAssignMemberId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Select Person --</option>
                {candidateList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || c.email || c.standard || "Registered"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold shadow-glow"
              >
                Confirm Assignment →
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
