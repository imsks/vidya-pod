"use client";

import React, { useState, useEffect } from "react";
import { AuthUser, DetailedPod } from "@/types/rbac";

interface TeacherDashboardProps {
  user: AuthUser;
}

interface FeedbackRecord {
  id: string;
  student_id: string;
  student_name?: string;
  feedback_text: string;
  rating: number;
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [pods, setPods] = useState<DetailedPod[]>([]);
  const [selectedPodId, setSelectedPodId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Academic Feedback State
  const [studentId, setStudentId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(5);
  const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackRecord[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(
    null,
  );

  // Item 16: Strictly fetch only assigned PODs for the teacher (no fallback to all PODs)
  useEffect(() => {
    let isMounted = true;
    const fetchPods = async () => {
      try {
        const res = await fetch(`/api/pods?memberId=${user.id}`);
        const data = await res.json();
        const loadedPods: DetailedPod[] = data.pods || [];

        if (isMounted) {
          setPods(loadedPods);
          if (loadedPods.length > 0) {
            setSelectedPodId(loadedPods[0].id);
          } else {
            setSelectedPodId("");
          }
        }
      } catch {
        // error handling
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPods();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const currentPod = pods.find((p) => p.id === selectedPodId);

  useEffect(() => {
    if (!selectedPodId) return;
    let isMounted = true;

    const fetchFeedbacks = async () => {
      try {
        const res = await fetch(`/api/feedback?podId=${selectedPodId}`);
        const data = await res.json();
        if (isMounted) {
          setRecentFeedbacks(data.feedbacks || []);
        }
      } catch {
        // ignore
      }
    };
    fetchFeedbacks();

    return () => {
      isMounted = false;
    };
  }, [selectedPodId]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !studentId || !feedbackText) return;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pod_id: selectedPodId,
          student_id: studentId,
          feedback_text: feedbackText,
          rating,
        }),
      });

      if (!res.ok) throw new Error("Failed to log academic note");

      setStatusMsg({ text: "Academic progress note logged successfully!", type: "success" });
      setFeedbackText("");
      setStudentId("");

      const fbRes = await fetch(`/api/feedback?podId=${selectedPodId}`);
      const fbData = await fbRes.json();
      setRecentFeedbacks(fbData.feedbacks || []);
    } catch {
      setStatusMsg({ text: "Failed to save note", type: "error" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            Teacher Portal — {user.name}
          </div>
          <h2 className="text-2xl font-black font-display">Assigned PODs & Academic Progress</h2>
          <p className="text-sm text-muted-foreground">
            Track student learning rosters, submit academic notes, and view feedback.
          </p>
        </div>

        {pods.length > 0 && (
          <select
            value={selectedPodId}
            onChange={(e) => setSelectedPodId(e.target.value)}
            className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold shadow-soft focus:outline-none"
          >
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                🧑‍🏫 {p.name} ({p.location})
              </option>
            ))}
          </select>
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
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading assigned PODs...</div>
      ) : !currentPod ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card">
          <div className="text-4xl mb-3">🧑‍🏫</div>
          <h3 className="text-lg font-bold">No Teaching POD Assigned</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            An Admin will assign you to a teaching POD shortly.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-5">
              <h3 className="text-lg font-bold font-display flex items-center justify-between border-b border-border pb-3">
                <span>🧒 Learning Roster — {currentPod.name}</span>
                <span className="text-xs px-3 py-1 rounded-full bg-muted font-normal text-muted-foreground">
                  {currentPod.students.length} Learners Enrolled
                </span>
              </h3>

              {currentPod.students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No students currently assigned to this POD.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {currentPod.students.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3 hover:border-primary/40 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-hero text-primary-foreground flex items-center justify-center font-bold">
                        {student.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Standard / Class {student.standard}
                        </div>
                        {student.hasAppAccess === false && (
                          <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                            Offline Learner Profile
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <form
              onSubmit={handleSubmitFeedback}
              className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4"
            >
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <span>📚 Academic Progress Note</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold mb-1">Select Student</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
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
                <label className="block text-xs font-semibold mb-1">Academic Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Good Progress)</option>
                  <option value={3}>⭐⭐⭐ (3 - Steady)</option>
                  <option value={2}>⭐⭐ (2 - Needs Support)</option>
                  {/* Item 22: Added missing Rating 1 option */}
                  <option value={1}>⭐ (1 - Critical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Progress Notes</label>
                <textarea
                  rows={3}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Mastered basic multiplication, strong reading comprehension"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-hero text-primary-foreground text-xs font-bold shadow-glow"
              >
                Log Academic Progress →
              </button>
            </form>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Class Feedback
              </h4>
              {recentFeedbacks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No feedback logged yet.</p>
              ) : (
                recentFeedbacks.slice(0, 4).map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{f.student_name}</span>
                      <span className="text-amber-500">{"⭐".repeat(f.rating || 5)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.feedback_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
