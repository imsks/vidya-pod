"use client";

import Link from "next/link";
import { useState } from "react";
import {
  REGISTRATION_ROLES,
  type RegistrationRole,
} from "@/constants/rbac";

export function RegisterPage() {
  const [role, setRole] = useState<RegistrationRole | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qualification, setQualification] = useState("");
  const [standard, setStandard] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body =
        role === "student"
          ? {
              role,
              name,
              phone,
              standard,
              image_url: imageUrl || undefined,
            }
          : {
              role,
              name,
              phone,
              qualification,
              image_url: imageUrl || undefined,
            };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-4xl">
            ✅
          </div>
          <h1 className="mt-6 text-3xl font-black font-display">
            You&apos;re In!
          </h1>
          <p className="mt-3 text-muted-foreground">
            Thank you, <strong className="text-foreground">{name}</strong>!
            You&apos;ve registered as a{" "}
            <strong className="text-foreground capitalize">{role}</strong>.
            We&apos;ll reach out to you soon.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
            >
              ← Back Home
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setRole(null);
                setName("");
                setPhone("");
                setQualification("");
                setStandard("");
                setImageUrl("");
              }}
              className="inline-flex items-center gap-2 rounded-full border-2 border-border px-6 py-3 font-semibold hover:border-foreground/40 transition-all"
            >
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold text-xl"
          >
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            Vidya Pods
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-16">
        <div className="text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Join the Movement
          </div>
          <h1 className="mt-3 text-4xl font-black font-display">Register</h1>
          <p className="mt-3 text-muted-foreground">
            Choose your role and fill in your details.
          </p>
        </div>

        {!role && (
          <div className="mt-10 grid gap-4">
            {REGISTRATION_ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className="flex items-center gap-5 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-soft hover:shadow-lift transition-all hover:-translate-y-1 text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-warm flex items-center justify-center text-3xl shadow-soft flex-shrink-0">
                  {r.icon}
                </div>
                <div>
                  <div className="font-bold text-lg">{r.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.description}
                  </div>
                </div>
                <span className="ml-auto text-muted-foreground">→</span>
              </button>
            ))}
          </div>
        )}

        {role && (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <button
              type="button"
              onClick={() => setRole(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1"
            >
              ← Change role
            </button>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
              Registering as {role}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit phone number"
                pattern="[0-9]{10}"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            {role === "student" ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Standard / Class
                </label>
                <select
                  required
                  value={standard}
                  onChange={(e) => setStandard(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                >
                  <option value="">Select your class</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={`${i + 1}`}>
                      Class {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Qualification
                </label>
                <input
                  type="text"
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder={
                    role === "teacher"
                      ? "e.g. B.Ed, M.Sc Mathematics"
                      : "e.g. Graduate, MBA"
                  }
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Profile Image URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-4 font-bold shadow-glow hover:shadow-lift transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register →"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}