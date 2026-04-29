import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refunds & Cancellations — Vidya Pods",
};

export default function RefundsPage() {
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

      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-black font-display !mb-2">
          Refunds &amp; Cancellations
        </h1>
        <p className="text-muted-foreground !mt-2">
          Last updated: 29 April 2026
        </p>

        <h2>1. Sponsorship Cancellation</h2>
        <p>
          Monthly sponsorships can be cancelled at any time. Once cancelled, no
          further charges will be made. The current month&apos;s sponsorship will
          continue until the end of the billing period.
        </p>

        <h2>2. Refund Policy</h2>
        <p>
          We understand that circumstances change. Our refund policy is as
          follows:
        </p>
        <ul>
          <li>
            <strong>Within 7 days of payment:</strong> Full refund available if
            the pod has not yet been assigned or classes have not started.
          </li>
          <li>
            <strong>After 7 days:</strong> Refunds are evaluated on a
            case-by-case basis. If classes have already begun, a partial refund
            (pro-rata) may be issued for unused days.
          </li>
          <li>
            <strong>Yearly sponsorships:</strong> Refunds for yearly plans are
            available within 14 days of payment if no pod has been assigned. After
            assignment, a pro-rata refund for remaining full months may be issued.
          </li>
        </ul>

        <h2>3. How to Request a Refund</h2>
        <p>
          To request a refund or cancel your sponsorship, email us at{" "}
          <a href="mailto:sachin@theboringeducation.com">
            sachin@theboringeducation.com
          </a>{" "}
          with your order ID and reason. We will process your request within 5–7
          business days.
        </p>

        <h2>4. Refund Method</h2>
        <p>
          Refunds will be credited back to the original payment method used
          during the transaction. Processing times may vary depending on your
          bank or payment provider (typically 5–10 business days).
        </p>

        <h2>5. Non-Refundable Cases</h2>
        <ul>
          <li>If the sponsored pod has already completed classes for the paid period.</li>
          <li>If the refund request is made after 30 days of payment with no prior communication.</li>
        </ul>

        <h2>6. Contact</h2>
        <p>
          For any refund or cancellation queries, reach out to us at{" "}
          <a href="mailto:sachin@theboringeducation.com">
            sachin@theboringeducation.com
          </a>{" "}
          or call{" "}
          <a href="tel:+919876543210">+91 8072937581</a>.
        </p>
      </main>
    </div>
  );
}
