"use client";

import Link from "next/link";
import { useState, useRef } from "react";

// TODO: Remove this PIN-based authentication once RBAC is enabled.
// This is a temporary solution for admin-only access to the learner upload feature.

type Step = "pin" | "form";

interface LearnerFormData {
  name: string;
  phone: string;
  standard: string;
  sponsorId: string;
}

export function UploadLearnerPage() {
  const [step, setStep] = useState<Step>("pin");
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [formData, setFormData] = useState<LearnerFormData>({
    name: "",
    phone: "",
    standard: "",
    sponsorId: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [createdLearner, setCreatedLearner] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) {
      setPinError("Please enter the admin PIN");
      return;
    }
    // Store the PIN for later use with API call
    // Validation happens server-side
    setPinError("");
    setStep("form");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      setError("");

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prepare request body
      const body: Record<string, unknown> = {
        admin_secret: adminPin,
        name: formData.name,
        phone: formData.phone,
        standard: formData.standard,
      };

      // Add optional sponsor_id if provided
      if (formData.sponsorId.trim()) {
        body.sponsor_id = formData.sponsorId;
      }

      // Add photo data if image is selected
      if (imageFile && imagePreview) {
        body.photo_data = imagePreview;
        body.photo_filename = imageFile.name;
      }

      const res = await fetch("/api/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // If unauthorized, go back to PIN step
        if (res.status === 401) {
          setStep("pin");
          setPinError(data.error || "Invalid admin PIN");
          setAdminPin("");
          return;
        }
        throw new Error(data.error || "Failed to upload learner");
      }

      setCreatedLearner({
        id: data.learner.id,
        name: data.learner.name,
      });
      if (data.warning) {
        setUploadWarning(data.warning);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setCreatedLearner(null);
    setUploadWarning(null);
    setFormData({
      name: "",
      phone: "",
      standard: "",
      sponsorId: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setError("");
  };

  // Success state
  if (submitted && createdLearner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-4xl">
            ✅
          </div>
          <h1 className="mt-6 text-3xl font-black font-display">Learner Added!</h1>
          <p className="mt-3 text-muted-foreground">
            <strong className="text-foreground">{createdLearner.name}</strong> has been successfully
            added to the platform.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">ID: {createdLearner.id}</p>
          {uploadWarning && (
            <div className="mt-4 rounded-xl bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-4 py-3 text-sm">
              ⚠️ {uploadWarning}
            </div>
          )}
          <div className="mt-8 flex gap-3 justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
            >
              ← Admin Dashboard
            </Link>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border-2 border-border px-6 py-3 font-semibold hover:border-foreground/40 transition-all"
            >
              Add Another Learner
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
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl">
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            Vidya Pods
          </Link>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← Back to Admin
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-16">
        <div className="text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Admin Access
          </div>
          <h1 className="mt-3 text-4xl font-black font-display">Upload Learner</h1>
          <p className="mt-3 text-muted-foreground">
            {step === "pin"
              ? "Enter the admin PIN to continue."
              : "Fill in the learner details below."}
          </p>
        </div>

        {/* TODO: Remove this PIN step once RBAC is enabled */}
        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="mt-10 space-y-5">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-hero flex items-center justify-center text-2xl shadow-glow">
                🔐
              </div>
              <h2 className="mt-4 text-center text-lg font-bold">Admin Verification</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                This page is restricted to administrators only.
              </p>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Admin PIN</label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter admin PIN"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>

              {pinError && (
                <div className="mt-4 rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm text-center">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className="mt-6 w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-3 font-bold shadow-glow hover:shadow-lift transition-all"
              >
                Continue →
              </button>
            </div>
          </form>
        )}

        {step === "form" && (
          <form onSubmit={handleFormSubmit} className="mt-10 space-y-5">
            <button
              type="button"
              onClick={() => {
                setStep("pin");
                setAdminPin("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1"
            >
              ← Change PIN
            </button>

            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter learner's full name"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="10-digit phone number"
                pattern="[0-9]{10}"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Standard / Class <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={formData.standard}
                onChange={(e) => setFormData((prev) => ({ ...prev, standard: e.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                <option value="">Select class</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={`${i + 1}`}>
                    Class {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sponsor ID <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.sponsorId}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorId: e.target.value }))}
                placeholder="Enter sponsor UUID (if any)"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Profile Photo <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-xl object-cover border border-border"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground truncate">{imageFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="mt-2 text-sm text-destructive hover:text-destructive/80 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="photo-upload"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                      📷
                    </div>
                    <p className="mt-3 text-sm font-medium">Click to upload photo</p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                  </label>
                )}
                <input
                  ref={fileInputRef}
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
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
              {loading ? "Uploading..." : "Upload Learner →"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
