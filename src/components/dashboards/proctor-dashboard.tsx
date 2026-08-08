"use client";

import React, { useState, useEffect } from "react";
import { AuthUser, DetailedPod } from "@/types/rbac";

interface ProctorDashboardProps {
  user: AuthUser;
}

export function ProctorDashboard({ user }: ProctorDashboardProps) {
  const [pods, setPods] = useState<DetailedPod[]>([]);
  const [selectedPodId, setSelectedPodId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Offline Learner Onboarding State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [learnerName, setLearnerName] = useState("");
  const [learnerPhone, setLearnerPhone] = useState("");
  const [learnerStandard, setLearnerStandard] = useState("1");
  const [hasAppAccess, setHasAppAccess] = useState(false); // Default false for offline learners

  // Attendance Tracker State
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, "PRESENT" | "ABSENT" | "EXCUSED">
  >({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Feedback State
  const [feedbackStudentId, setFeedbackStudentId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [recentFeedbacks, setRecentFeedbacks] = useState<any[]>([]);

  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadProctorPods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pods?memberId=${user.id}`);
      const data = await res.json();
      const loadedPods: DetailedPod[] = data.pods || [];

      // If proctor is not explicitly in member list (e.g. dev/admin override), fetch all pods
      if (loadedPods.length === 0) {
        const allRes = await fetch("/api/pods");
        const allData = await allRes.json();
        setPods(allData.pods || []);
        if (allData.pods?.length > 0) setSelectedPodId(allData.pods[0].id);
      } else {
        setPods(loadedPods);
        setSelectedPodId(loadedPods[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProctorPods();
  }, [user.id]);

  const currentPod = pods.find((p) => p.id === selectedPodId);

  // Initialize attendance records when pod or date changes
  useEffect(() => {
    if (!selectedPodId) return;

    const fetchExistingAttendance = async () => {
      try {
        const res = await fetch(`/api/attendance?podId=${selectedPodId}&date=${attendanceDate}`);
        const data = await res.json();
        const initialMap: Record<string, "PRESENT" | "ABSENT" | "EXCUSED"> = {};
        const initialNotes: Record<string, string> = {};

        // Default all learners in pod to PRESENT
        if (currentPod) {
          currentPod.students.forEach((s) => {
            initialMap[s.id] = "PRESENT";
          });
        }

        // Override with existing saved records
        (data.records || []).forEach((r: any) => {
          initialMap[r.student_id] = r.status;
          if (r.notes) initialNotes[r.student_id] = r.notes;
        });

        setAttendanceMap(initialMap);
        setAttendanceNotes(initialNotes);
      } catch (err) {
        console.error("Failed to load attendance", err);
      }
    };

    const fetchFeedbacks = async () => {
      try {
        const res = await fetch(`/api/feedback?podId=${selectedPodId}`);
        const data = await res.json();
        setRecentFeedbacks(data.feedbacks || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchExistingAttendance();
    fetchFeedbacks();
  }, [selectedPodId, attendanceDate, currentPod]);

  // Handle Offline Learner Onboarding
  const handleOnboardLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId) return;

    try {
      const res = await fetch("/api/onboard-learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: learnerName,
          phone: learnerPhone,
          standard: learnerStandard,
          pod_id: selectedPodId,
          has_app_access: hasAppAccess,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onboarding failed");

      setStatusMsg({
        text: `Learner ${learnerName} onboarded into POD successfully!`,
        type: "success",
      });
      setShowOnboardModal(false);
      setLearnerName("");
      setLearnerPhone("");
      loadProctorPods();
    } catch (err) {
      setStatusMsg({
        text: err instanceof Error ? err.message : "Onboarding failed",
        type: "error",
      });
    }
  };

  // Save Daily Attendance Matrix
  const handleSaveAttendance = async () => {
    if (!selectedPodId || !currentPod) return;
    setSavingAttendance(true);

    try {
      const recordsToSave = currentPod.students.map((s) => ({
        student_id: s.id,
        status: attendanceMap[s.id] || "PRESENT",
        notes: attendanceNotes[s.id] || "",
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pod_id: selectedPodId,
          proctor_id: user.id,
          date: attendanceDate,
          records: recordsToSave,
        }),
      });

      if (!res.ok) throw new Error("Failed to save attendance");

      setStatusMsg({ text: `Attendance for ${attendanceDate} saved successfully!`, type: "success" });
    } catch (err) {
      setStatusMsg({ text: "Failed to save attendance", type: "error" });
    } finally {
      setSavingAttendance(false);
    }
  };

  // Submit Learner Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !feedbackStudentId || !feedbackText) return;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pod_id: selectedPodId,
          student_id: feedbackStudentId,
          author_id: user.id,
          author_role: "proctor",
          feedback_text: feedbackText,
          rating: feedbackRating,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      setStatusMsg({ text: "Feedback submitted successfully!", type: "success" });
      setFeedbackText("");
      setFeedbackStudentId("");

      // Reload feedback
      const fbRes = await fetch(`/api/feedback?podId=${selectedPodId}`);
      const fbData = await fbRes.json();
      setRecentFeedbacks(fbData.feedbacks || []);
    } catch (err) {
      setStatusMsg({ text: "Failed to submit feedback", type: "error" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider mb-1">
            Proctor Portal — {user.name}
          </div>
          <h2 className="text-2xl font-black font-display">POD Management & Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Onboard offline learners, mark daily attendance, and log behavioral feedback.
          </p>
        </div>

        {/* POD Selector */}
        {pods.length > 0 && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedPodId}
              onChange={(e) => setSelectedPodId(e.target.value)}
              className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold shadow-soft focus:outline-none"
            >
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  🏫 {p.name} ({p.location})
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowOnboardModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold shadow-glow hover:shadow-lift transition-all whitespace-nowrap"
            >
              + Onboard Learner
            </button>
          </div>
        )}
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
          <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading assigned PODs...</div>
      ) : !currentPod ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card">
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="text-lg font-bold">No POD Assigned Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            An Admin will assign you to your designated POD shortly.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Column: Attendance Tracker Matrix */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold font-display">Daily Attendance Tracker</h3>
                  <p className="text-xs text-muted-foreground">
                    Mark presence for learners in <strong className="text-foreground">{currentPod.name}</strong>
                  </p>
                </div>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold"
                />
              </div>

              {currentPod.students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No learners in this POD yet. Click <strong>+ Onboard Learner</strong> to add students!
                </div>
              ) : (
                <div className="space-y-3">
                  {currentPod.students.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {student.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            {student.name}
                            <span className="text-xs font-normal text-muted-foreground">
                              (Class {student.standard})
                            </span>
                            {student.hasAppAccess === false && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                                Offline Learner
                              </span>
                            )}
                          </div>
                          {student.phone && (
                            <div className="text-xs text-muted-foreground">📞 {student.phone}</div>
                          )}
                        </div>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {(["PRESENT", "ABSENT", "EXCUSED"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({
                                ...prev,
                                [student.id]: status,
                              }))
                            }
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              attendanceMap[student.id] === status
                                ? status === "PRESENT"
                                  ? "bg-accent text-accent-foreground shadow-soft"
                                  : status === "ABSENT"
                                  ? "bg-destructive text-destructive-foreground shadow-soft"
                                  : "bg-amber-500 text-white shadow-soft"
                                : "bg-card text-muted-foreground border border-border hover:bg-muted"
                            }`}
                          >
                            {status === "PRESENT" && "✓ Present"}
                            {status === "ABSENT" && "✕ Absent"}
                            {status === "EXCUSED" && "⏰ Excused"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                      className="px-6 py-3 rounded-full bg-gradient-hero text-primary-foreground font-bold text-sm shadow-glow hover:shadow-lift transition-all disabled:opacity-60"
                    >
                      {savingAttendance ? "Saving..." : "Save Attendance Record →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Feedback Log & Onboard trigger */}
          <div className="space-y-6">
            {/* Submit Feedback Card */}
            <form
              onSubmit={handleSubmitFeedback}
              className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4"
            >
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <span>📝 Log Learner Observation</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold mb-1">Select Learner</label>
                <select
                  required
                  value={feedbackStudentId}
                  onChange={(e) => setFeedbackStudentId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="">-- Choose Learner --</option>
                  {currentPod.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Class {s.standard})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Rating (1-5)</label>
                <select
                  value={feedbackRating}
                  onChange={(e) => setFeedbackRating(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Average)</option>
                  <option value={2}>⭐⭐ (2 - Needs Attention)</option>
                  <option value={1}>⭐ (1 - Critical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observation / Notes</label>
                <textarea
                  rows={3}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Improved participation, needs help in reading"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all"
              >
                Submit Observation →
              </button>
            </form>

            {/* Recent Feedbacks List */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Feedback Logs
              </h4>
              {recentFeedbacks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No feedback logged yet for this POD.</p>
              ) : (
                recentFeedbacks.slice(0, 4).map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{f.student_name}</span>
                      <span className="text-amber-500">{"⭐".repeat(f.rating || 5)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.feedback_text}</p>
                    <div className="text-[10px] text-muted-foreground/70 text-right">
                      {new Date(f.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Offline Learner Onboarding */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleOnboardLearner}
            className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-lift space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="text-xl font-bold font-display">Onboard Offline Learner</h3>
                <p className="text-xs text-muted-foreground">
                  Proctor onboarding for students without internet/email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Learner Full Name</label>
              <input
                type="text"
                required
                value={learnerName}
                onChange={(e) => setLearnerName(e.target.value)}
                placeholder="Enter child's full name"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Guardian Phone <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={learnerPhone}
                onChange={(e) => setLearnerPhone(e.target.value)}
                placeholder="10-digit phone number"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Class / Standard</label>
              <select
                required
                value={learnerStandard}
                onChange={(e) => setLearnerStandard(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={`${i + 1}`}>
                    Class {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border border-border">
              <input
                type="checkbox"
                id="appAccess"
                checked={hasAppAccess}
                onChange={(e) => setHasAppAccess(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <label htmlFor="appAccess" className="text-xs font-semibold">
                Enable App Login Access (Default: false for offline learners)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold shadow-glow"
              >
                Onboard Learner →
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
