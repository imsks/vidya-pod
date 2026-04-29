import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us — Vidya Pods",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold text-xl"
          >
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            Vidya Pods
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black font-display">Contact Us</h1>
        <p className="mt-4 text-muted-foreground">
          We&apos;d love to hear from you. Reach out to us for any queries,
          feedback, or support.
        </p>

        <div className="mt-10 space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <h2 className="text-lg font-bold">Email</h2>
            <p className="mt-2 text-muted-foreground">
              <a
                href="mailto:sachin@theboringeducation.com"
                className="text-primary hover:underline"
              >
                sachin@theboringeducation.com
              </a>
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <h2 className="text-lg font-bold">Phone</h2>
            <p className="mt-2 text-muted-foreground">
              <a href="tel:+919876543210" className="text-primary hover:underline">
                +91 8072937581
              </a>
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <h2 className="text-lg font-bold">Organization</h2>
            <p className="mt-2 text-muted-foreground">
              The Boring Education
            </p>
            <p className="mt-1 text-muted-foreground">
              India
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <h2 className="text-lg font-bold">Response Time</h2>
            <p className="mt-2 text-muted-foreground">
              We typically respond within 24–48 hours on working days.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
