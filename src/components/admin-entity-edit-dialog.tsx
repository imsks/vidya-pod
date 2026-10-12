"use client";

import { useRef, useState } from "react";
import type { AdminEditableEntity } from "@/lib/validation/admin-entity-update";
import type { LearnerRecord, ProctorRecord, TeacherRecord } from "@/types/admin";

export type EditableRecord = LearnerRecord | TeacherRecord | ProctorRecord;

const ENTITY_LABEL: Record<AdminEditableEntity, string> = {
  learner: "Learner",
  teacher: "Teacher",
  proctor: "Proctor",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface AdminEntityEditDialogProps {
  entity: AdminEditableEntity;
  record: EditableRecord;
  sessionPin: string;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition";

export function AdminEntityEditDialog({
  entity,
  record,
  sessionPin,
  onClose,
  onSaved,
}: AdminEntityEditDialogProps) {
  const isLearner = entity === "learner";

  const [name, setName] = useState(record.name ?? "");
  const [phone, setPhone] = useState(record.phone ?? "");
  const [standard, setStandard] = useState((record as LearnerRecord).standard ?? "");
  const [qualification, setQualification] = useState((record as TeacherRecord).qualification ?? "");
  const [imageUrl, setImageUrl] = useState(record.image_url ?? "");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoFilename, setPhotoFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = photoData ?? (imageUrl.trim() || null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError("Image size must be less than 5MB");
      return;
    }

    setError("");
    // A newly picked file replaces the stored URL, so clear it to avoid ambiguity.
    setImageUrl("");
    setPhotoFilename(file.name);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoData(null);
    setPhotoFilename(null);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name,
        phone,
        image_url: imageUrl.trim(),
        ...(isLearner ? { standard } : { qualification }),
        ...(photoData && photoFilename
          ? { photo_data: photoData, photo_filename: photoFilename }
          : {}),
      };

      const res = await fetch(`/api/admin/${entity}/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": sessionPin },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string; warning?: string };

      if (!res.ok) {
        setError(data.error || "Failed to save changes");
        return;
      }

      onSaved();
    } catch {
      setError("Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-border bg-card p-7 shadow-lift"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-black">Edit {ENTITY_LABEL[entity]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{record.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Phone {isLearner && <span className="text-muted-foreground">(optional)</span>}
          </label>
          <input
            required={!isLearner}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        {isLearner ? (
          <div>
            <label className="mb-2 block text-sm font-medium">Class / Standard</label>
            <input
              required
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium">Qualification</label>
            <input
              required
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Photo URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setPhotoData(null);
              setPhotoFilename(null);
            }}
            placeholder="https://..."
            className={inputClass}
          />
          <div className="mt-3 flex items-center gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-12 w-12 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                -
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-xs text-muted-foreground file:mr-3 file:rounded-full file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-semibold"
            />
            {previewUrl && (
              <button
                type="button"
                onClick={clearPhoto}
                className="text-xs text-muted-foreground underline transition hover:text-destructive"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-hero px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:shadow-lift disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
