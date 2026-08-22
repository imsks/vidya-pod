"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  clearAdminSessionPin,
  getAdminSessionPin,
  setAdminSessionPin,
  subscribeAdminSessionPin,
} from "@/lib/admin-session";

export type AdminUploadEntityType = "teacher" | "student" | "proctor" | "learner";

type EntityConfig = {
  title: string;
  description: string;
  submitLabel: string;
  successTitle: string;
  addAnotherLabel: string;
  icon: string;
};

const ENTITY_CONFIG: Record<AdminUploadEntityType, EntityConfig> = {
  teacher: {
    title: "Add Teacher",
    description: "Register a new teacher with profile details and photo.",
    submitLabel: "Add Teacher →",
    successTitle: "Teacher Added!",
    addAnotherLabel: "Add Another Teacher",
    icon: "🧑‍🏫",
  },
  student: {
    title: "Add Student",
    description: "Register a new student with profile details and photo.",
    submitLabel: "Add Student →",
    successTitle: "Student Added!",
    addAnotherLabel: "Add Another Student",
    icon: "🧒",
  },
  proctor: {
    title: "Add Proctor",
    description: "Register a new proctor with profile details and photo.",
    submitLabel: "Add Proctor →",
    successTitle: "Proctor Added!",
    addAnotherLabel: "Add Another Proctor",
    icon: "🛡️",
  },
  learner: {
    title: "Add Learner",
    description: "Add a learner available for sponsorship with profile details and photo.",
    submitLabel: "Add Learner →",
    successTitle: "Learner Added!",
    addAnotherLabel: "Add Another Learner",
    icon: "📚",
  },
};

interface FormState {
  name: string;
  phone: string;
  standard: string;
  qualification: string;
  sponsorId: string;
}

const emptyFormState = (): FormState => ({
  name: "",
  phone: "",
  standard: "",
  qualification: "",
  sponsorId: "",
});

interface AdminEntityUploadPageProps {
  entityType: AdminUploadEntityType;
}

export function AdminEntityUploadPage({ entityType }: AdminEntityUploadPageProps) {
  const config = ENTITY_CONFIG[entityType];

  const sessionPin = useSyncExternalStore(
    subscribeAdminSessionPin,
    () => getAdminSessionPin() ?? "",
    () => "",
  );
  const authenticated = sessionPin.length > 0;

  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [createdEntity, setCreatedEntity] = useState<{ id: string; name: string } | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPin = adminPin.trim();

    if (!trimmedPin) {
      setPinError("Please enter the admin PIN");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_secret: trimmedPin }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setPinError(data.error || "Invalid admin PIN");
        return;
      }

      setAdminSessionPin(trimmedPin);
      setAdminPin("");
    } catch {
      setPinError("Unable to verify admin PIN. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      const photoFields =
        imageFile && imagePreview
          ? { photo_data: imagePreview, photo_filename: imageFile.name }
          : {};

      let res: Response;
      let data: Record<string, unknown>;

      if (entityType === "learner") {
        const body: Record<string, unknown> = {
          admin_secret: sessionPin,
          name: formData.name,
          phone: formData.phone,
          standard: formData.standard,
          ...photoFields,
        };

        if (formData.sponsorId.trim()) {
          body.sponsor_id = formData.sponsorId.trim();
        }

        res = await fetch("/api/learner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        data = await res.json();
      } else {
        const body: Record<string, unknown> = {
          role: entityType,
          name: formData.name,
          phone: formData.phone,
          ...photoFields,
        };

        if (entityType === "student") {
          body.standard = formData.standard;
        } else {
          body.qualification = formData.qualification;
        }

        res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": sessionPin,
          },
          body: JSON.stringify(body),
        });
        data = await res.json();
      }

      if (!res.ok) {
        if (res.status === 401) {
          clearAdminSessionPin();
          setPinError((data.error as string) || "Invalid admin PIN");
          return;
        }
        throw new Error((data.error as string) || "Failed to save");
      }

      const entity =
        entityType === "learner"
          ? (data.learner as { id: string; name: string })
          : (data.entity as { id: string; name: string });

      setCreatedEntity({ id: entity.id, name: entity.name });
      if (typeof data.warning === "string") {
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
    setCreatedEntity(null);
    setUploadWarning(null);
    setFormData(emptyFormState());
    setImageFile(null);
    setImagePreview(null);
    setError("");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-sm p-8 rounded-3xl bg-card border border-border shadow-lift space-y-5"
        >
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-hero flex items-center justify-center text-2xl shadow-glow">
              🔐
            </div>
            <h1 className="mt-4 text-2xl font-black font-display">Admin Access Required</h1>
            <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
          </div>

          <div>
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
            <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm text-center">
              {pinError}
            </div>
          )}

          <button
            type="submit"
            disabled={pinLoading}
            className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-3 font-bold shadow-glow hover:shadow-lift transition-all disabled:opacity-60"
          >
            {pinLoading ? "Verifying..." : "Continue →"}
          </button>

          <Link
            href="/admin"
            className="block text-center text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← Back to Admin
          </Link>
        </form>
      </div>
    );
  }

  if (submitted && createdEntity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-4xl">
            ✅
          </div>
          <h1 className="mt-6 text-3xl font-black font-display">{config.successTitle}</h1>
          <p className="mt-3 text-muted-foreground">
            <strong className="text-foreground">{createdEntity.name}</strong> has been successfully
            added to the platform.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">ID: {createdEntity.id}</p>
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
              {config.addAnotherLabel}
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
          <Link href="/admin" className="flex items-center gap-2 font-display font-bold text-xl">
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            Vidya Pods Admin
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
            {config.icon} Admin
          </div>
          <h1 className="mt-3 text-4xl font-black font-display">{config.title}</h1>
          <p className="mt-3 text-muted-foreground">{config.description}</p>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-10 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
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

          {entityType === "student" || entityType === "learner" ? (
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
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                Qualification <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.qualification}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, qualification: e.target.value }))
                }
                placeholder={
                  entityType === "teacher" ? "e.g. B.Ed, M.Sc Mathematics" : "e.g. Graduate, MBA"
                }
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
          )}

          {entityType === "learner" && (
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
          )}

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
                  htmlFor={`photo-upload-${entityType}`}
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
                id={`photo-upload-${entityType}`}
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
            {loading ? "Saving..." : config.submitLabel}
          </button>
        </form>
      </main>
    </div>
  );
}
