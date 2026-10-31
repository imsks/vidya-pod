"use client";

import { useState } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/constants/expenses";
import type { ExpenseRecord } from "@/types/admin";

interface AdminExpensesPanelProps {
  expenses: ExpenseRecord[];
  sessionPin: string;
  onChanged: () => Promise<void>;
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatINR = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export function AdminExpensesPanel({ expenses, sessionPin, onChanged }: AdminExpensesPanelProps) {
  const [category, setCategory] = useState<ExpenseCategory>("STATIONERY");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [incurredAt, setIncurredAt] = useState(getToday);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": sessionPin,
        },
        body: JSON.stringify({
          category,
          amount: Number(amount),
          description,
          incurred_at: incurredAt,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to save expense");
        return;
      }

      setAmount("");
      setDescription("");
      setSuccess("Expense recorded.");
      await onChanged();
    } catch {
      setError("Unable to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": sessionPin },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to delete expense");
        return;
      }

      setConfirmDeleteId(null);
      setSuccess("Expense removed.");
      await onChanged();
    } catch {
      setError("Unable to delete expense. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="font-display text-xl font-black">Record an expense</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These details will be visible on the public transparency page. Don&apos;t include
            private student or payment information.
          </p>
        </div>

        <label className="space-y-2 text-sm font-medium">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className={inputClass}
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {EXPENSE_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium">
          Amount (₹)
          <input
            type="number"
            min="1"
            step="1"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="space-y-2 text-sm font-medium">
          Date spent
          <input
            type="date"
            required
            value={incurredAt}
            onChange={(event) => setIncurredAt(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="space-y-2 text-sm font-medium">
          Description
          <input
            required
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Notebooks for the learning pod"
            className={inputClass}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive md:col-span-2">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-primary md:col-span-2">
            {success}
          </p>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:shadow-lift disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add expense"}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-xl font-black">Recorded expenses</h2>
        </div>
        {expenses.length ? (
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{expense.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {EXPENSE_CATEGORY_LABELS[expense.category]} · {expense.incurred_at}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">{formatINR(expense.amount)}</span>
                  {confirmDeleteId === expense.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span>Remove?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="font-semibold text-destructive disabled:opacity-60"
                      >
                        {deletingId === expense.id ? "Removing..." : "Yes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(expense.id)}
                      className="text-xs font-semibold text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No expenses recorded yet.
          </p>
        )}
      </section>
    </div>
  );
}
