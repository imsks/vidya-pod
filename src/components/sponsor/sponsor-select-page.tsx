"use client";

import { SponsorHeader } from "./sponsor-header";
import { LearnerGrid } from "./learner-grid";

export const SponsorSelectPage = () => (
  <div className="min-h-screen bg-background">
    <SponsorHeader />

    <main className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center">
        <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Sponsor a Pod
        </div>
        <h1 className="mt-3 text-4xl md:text-5xl font-black font-display">
          Choose a child to <span className="text-gradient">sponsor</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          These children are waiting for a sponsor like you. Select one to begin funding their
          learning pod.
        </p>
      </div>

      <div className="mt-16">
        <LearnerGrid />
      </div>
    </main>
  </div>
);
