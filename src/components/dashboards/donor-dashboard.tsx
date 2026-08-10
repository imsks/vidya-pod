"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AuthUser, DetailedPod } from "@/types/rbac";

interface DonorDashboardProps {
  user: AuthUser;
}

export function DonorDashboard({ user }: DonorDashboardProps) {
  const [pods, setPods] = useState<DetailedPod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDonorPods = async () => {
      try {
        const res = await fetch(`/api/pods?memberId=${user.id}`);
        const data = await res.json();
        if (isMounted) {
          setPods(data.pods || []);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadDonorPods();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
            Donor Portal — {user.name}
          </div>
          <h2 className="text-2xl font-black font-display font-display">Your Sponsorship Impact</h2>
          <p className="text-sm text-muted-foreground">
            Track your sponsored PODs, student impact, and contribution history.
          </p>
        </div>

        <Link
          href="/sponsor"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-hero text-primary-foreground font-bold text-sm shadow-glow hover:shadow-lift transition-all"
        >
          + Sponsor Another POD
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-2">💛</div>
          <div className="text-sm text-muted-foreground font-semibold">Payment Type</div>
          <div className="text-xl font-bold font-display mt-1">One-Time Sponsorship</div>
          <div className="text-xs text-muted-foreground mt-1">
            (Non-Recurring per Issue Guidelines)
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-2">🏫</div>
          <div className="text-sm text-muted-foreground font-semibold">Sponsored PODs</div>
          <div className="text-3xl font-black font-display mt-1">{pods.length}</div>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border shadow-soft">
          <div className="text-2xl mb-2">🎓</div>
          <div className="text-sm text-muted-foreground font-semibold">Impacted Learners</div>
          <div className="text-3xl font-black font-display mt-1">
            {pods.reduce((acc, p) => acc + (p.students?.length || 0), 0)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">
          Loading sponsored POD impact...
        </div>
      ) : pods.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card space-y-3">
          <div className="text-4xl">💛</div>
          <h3 className="text-lg font-bold">Thank You for Supporting Vidya Pods!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            An Admin will link your sponsorship to a specific local POD shortly. You will be able to
            see the kids, teachers, and progress right here!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-xl font-bold font-display">Sponsored POD Roster & Progress</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {pods.map((pod) => (
              <div
                key={pod.id}
                className="p-6 rounded-3xl bg-card border border-border shadow-soft space-y-4"
              >
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-muted">
                      {pod.code}
                    </span>
                    <h4 className="text-lg font-bold font-display mt-1">{pod.name}</h4>
                    <p className="text-xs text-muted-foreground">📍 {pod.location}</p>
                  </div>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Enrolled Learners ({pod.students?.length || 0})
                </div>

                <div className="flex flex-wrap gap-2">
                  {pod.students?.map((s) => (
                    <span
                      key={s.id}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                    >
                      {s.name} (Class {s.standard})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
