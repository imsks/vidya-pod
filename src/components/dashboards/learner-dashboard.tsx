"use client";

import React, { useState, useEffect } from "react";
import { AuthUser } from "@/types/rbac";

interface LearnerDashboardProps {
  user: AuthUser;
}

export function LearnerDashboard({ user }: LearnerDashboardProps) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [podInfo, setPodInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLearnerData = async () => {
      setLoading(true);
      try {
        const [attRes, fbRes, podRes] = await Promise.all([
          fetch(`/api/attendance?studentId=${user.id}`),
          fetch(`/api/feedback?studentId=${user.id}`),
          fetch(`/api/pods?memberId=${user.id}`),
        ]);

        const attData = await attRes.json();
        const fbData = await fbRes.json();
        const podData = await podRes.json();

        setAttendance(attData.records || []);
        setFeedbacks(fbData.feedbacks || []);
        if (podData.pods && podData.pods.length > 0) {
          setPodInfo(podData.pods[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLearnerData();
  }, [user.id]);

  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const totalCount = attendance.length;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider mb-1">
            Learner Portal — Class {user.standard || "School"}
          </div>
          <h2 className="text-2xl font-black font-display">Welcome Back, {user.name}!</h2>
          <p className="text-sm text-muted-foreground">
            View your pod learning schedule, attendance records, and teacher feedback notes.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-center gap-4">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase">Attendance Rate</div>
            <div className="text-2xl font-black font-display text-primary">{attendancePercentage}%</div>
          </div>
          <div className="text-3xl">🎓</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading your pod details...</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Enrolled Pod & Teacher Info */}
          <div className="lg:col-span-2 space-y-6">
            {podInfo ? (
              <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted">
                      {podInfo.code}
                    </span>
                    <h3 className="text-xl font-bold font-display mt-1">{podInfo.name}</h3>
                    <p className="text-xs text-muted-foreground">📍 Location: {podInfo.location}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                    <div className="text-xs font-bold text-muted-foreground uppercase mb-1">
                      🧑‍🏫 Teacher
                    </div>
                    {podInfo.teachers?.length > 0 ? (
                      <div className="font-bold text-sm">{podInfo.teachers[0].name}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Teacher assigning soon</div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                    <div className="text-xs font-bold text-muted-foreground uppercase mb-1">
                      🛡️ Proctor
                    </div>
                    {podInfo.proctors?.length > 0 ? (
                      <div className="font-bold text-sm">{podInfo.proctors[0].name}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Proctor assigning soon</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl border border-dashed border-border text-center text-muted-foreground">
                You are registered. Your Proctor or Admin will assign you to a local POD soon.
              </div>
            )}

            {/* Attendance History */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4">
              <h3 className="text-base font-bold font-display">📅 Recent Attendance History</h3>
              {attendance.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No attendance records logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 5).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold">{rec.date}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold ${
                          rec.status === "PRESENT"
                            ? "bg-accent/20 text-accent"
                            : rec.status === "ABSENT"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-amber-500/20 text-amber-600"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Teacher & Proctor Feedback Notes */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4">
              <h3 className="text-base font-bold font-display">📝 Progress & Feedback Notes</h3>
              {feedbacks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No teacher/proctor notes available yet.</p>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((f) => (
                    <div key={f.id} className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="capitalize text-primary">
                          {f.author_role} Feedback
                        </span>
                        <span className="text-amber-500">{"⭐".repeat(f.rating || 5)}</span>
                      </div>
                      <p className="text-xs text-foreground mt-1">{f.feedback_text}</p>
                      <div className="text-[10px] text-muted-foreground text-right mt-1">
                        {new Date(f.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
