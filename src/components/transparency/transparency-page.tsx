"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EXPENSE_CATEGORY_LABELS } from "@/constants/expenses";
import { SponsorHeader } from "@/components/sponsor/sponsor-header";
import type { TransparencyResponse } from "./types";

const formatINR = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (incurredAt: string) =>
  new Date(`${incurredAt}T00:00:00.000Z`).toLocaleDateString("en-IN", { timeZone: "UTC" });

export const TransparencyPage = () => {
  const [summary, setSummary] = useState<TransparencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/transparency");
      if (!res.ok) {
        throw new Error("Failed to load figures");
      }

      setSummary(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load figures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSummary]);

  const renderBody = () => {
    if (loading) {
      return (
        <p className="mt-10 text-muted-foreground" role="status">
          Loading the latest figures…
        </p>
      );
    }

    if (error || !summary) {
      return (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <p className="font-semibold">We could not load the figures right now.</p>
          <button
            type="button"
            onClick={() => void fetchSummary()}
            className="mt-4 rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Try again
          </button>
        </div>
      );
    }

    const { received, spent, category_totals, recent_expenses, supporters } = summary;

    return (
      <>
        <section aria-label="Funding summary" className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Online sponsorship received", amount: received },
            { label: "Recorded expenses", amount: spent },
            { label: "Received minus recorded expenses", amount: received - spent },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-black">{formatINR(item.amount)}</p>
            </div>
          ))}
        </section>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          The difference is not a verified bank balance. This page includes online sponsorship
          payments marked successful and expenses entered in the admin panel; other income,
          transfers, and unrecorded expenses are not included.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-black">Recorded spending by category</h2>
          {category_totals.length ? (
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card px-5">
              {category_totals.map((item) => (
                <div key={item.category} className="flex items-center justify-between gap-4 py-4">
                  <span>{EXPENSE_CATEGORY_LABELS[item.category]}</span>
                  <span className="font-semibold">{formatINR(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">No expenses have been recorded yet.</p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-black">Recent expenses</h2>
          {recent_expenses.length ? (
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card px-5">
              {recent_expenses.map((expense) => (
                <article
                  key={expense.id}
                  className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{expense.description}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {EXPENSE_CATEGORY_LABELS[expense.category]} ·{" "}
                      {formatDate(expense.incurred_at)}
                    </p>
                  </div>
                  <p className="font-bold">{formatINR(expense.amount)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">No expenses have been recorded yet.</p>
          )}
          {recent_expenses.length === summary.recent_expense_limit && (
            <p className="mt-3 text-sm text-muted-foreground">
              Showing the {summary.recent_expense_limit} most recent expenses. Category totals
              include all recorded expenses.
            </p>
          )}
        </section>

        <section className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-black">Thank you, supporters</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Names appear here only when a supporter has chosen to be acknowledged publicly.
          </p>
          {supporters.length ? (
            <ul className="mt-5 flex flex-wrap gap-3">
              {supporters.map((supporter) => (
                <li
                  key={supporter.id}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  {supporter.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Our first public thank-yous will appear here soon.
            </p>
          )}
        </section>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />
      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Open books, shared impact
          </p>
          <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">
            Where the support goes
          </h1>
          <p className="mt-4 text-muted-foreground">
            A simple record of successful online sponsorship payments and expenses entered by our
            team. Donor contact details and individual donation amounts are never shown here.
          </p>
        </div>

        {renderBody()}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/sponsor"
            className="rounded-full bg-gradient-hero px-6 py-3 font-semibold text-primary-foreground shadow-glow transition hover:shadow-lift"
          >
            Support a learner
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Back to Vidya Pods
          </Link>
        </div>
      </main>
    </div>
  );
};
