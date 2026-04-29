import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — Vidya Pods",
};

export default function TermsPage() {
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
          Terms &amp; Conditions
        </h1>
        <p className="text-muted-foreground !mt-2">
          Last updated: 29 April 2026
        </p>

        <h2>1. Overview</h2>
        <p>
          Vidya Pods is an educational initiative operated by The Boring
          Education. By using this website and making payments through it, you
          agree to the following terms.
        </p>

        <h2>2. Services</h2>
        <p>
          Vidya Pods provides pod-based education services consisting of:
        </p>
        <ul>
          <li>Home tuition for children in pods of 4–10 students</li>
          <li>Teacher compensation and coordination</li>
          <li>Books, stationery, and learning materials</li>
          <li>Proctor management and scheduling</li>
        </ul>

        <h2>3. Pricing</h2>
        <p>All prices are listed in Indian Rupees (INR).</p>
        <ul>
          <li>
            <strong>Monthly Sponsorship:</strong> ₹4,000/month
          </li>
          <li>
            <strong>Yearly Sponsorship:</strong> ₹42,000/year (save ₹6,000)
          </li>
        </ul>

        <h2>4. Payment</h2>
        <p>
          Payments are processed securely through Cashfree Payments. By making a
          payment, you agree to Cashfree&apos;s terms of service in addition to
          these terms.
        </p>

        <h2>5. Use of Funds</h2>
        <p>
          100% of sponsorship funds are allocated to pod operations — teacher
          salaries, books, stationery, and proctor fees. We do not use
          sponsorship funds for administrative overhead.
        </p>

        <h2>6. User Accounts</h2>
        <p>
          Registration is managed by administrators. Users provide their name,
          phone number, and relevant details. We store this information securely
          and use it only for pod operations.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          All content on this website — including text, graphics, logos, and
          design — is owned by The Boring Education and may not be reproduced
          without permission.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          The Boring Education shall not be liable for any indirect, incidental,
          or consequential damages arising from the use of this website or
          services.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to update these terms at any time. Changes will be
          posted on this page with an updated date.
        </p>

        <h2>10. Contact</h2>
        <p>
          For questions about these terms, contact us at{" "}
          <a href="mailto:sachin@theboringeducation.com">
            sachin@theboringeducation.com
          </a>
          .
        </p>
      </main>
    </div>
  );
}
