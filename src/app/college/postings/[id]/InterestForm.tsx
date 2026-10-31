"use client";

import { useState, useTransition } from "react";
import { upsertInterest } from "@/app/college/actions";
import { createClient } from "@/lib/supabase/client";
import type { InterestReport } from "@/lib/types";

export default function InterestForm({
  postingId,
  existing,
  initialResumePaths = [],
}: {
  postingId: string;
  existing: InterestReport | null;
  initialResumePaths?: string[];
}) {
  const [interested, setInterested] = useState(existing?.interested_count ?? 0);
  const [eligible, setEligible] = useState(existing?.eligible_count ?? 0);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumePaths, setResumePaths] = useState(initialResumePaths);
  const [uploading, setUploading] = useState(false);

  async function uploadResumes(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      setUploading(false);
      return;
    }
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      if (!allowedTypes.has(file.type)) {
        setError("Each resume must be a PDF, DOC, or DOCX file.");
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Each resume must be 10 MB or smaller.");
        break;
      }
      const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${crypto.randomUUID()}`;
      const storagePath = `${user.id}/jobs/${postingId}/${path}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) {
        setError("Could not upload one or more resumes. Please try again.");
        break;
      }
      uploaded.push(storagePath);
    }

    if (uploaded.length) {
      setResumePaths((current) => [...current, ...uploaded]);
      setSaved(false);
    }
    setUploading(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isPending) return;

    setSaved(false);
    setError(null);

    if (interested > eligible) {
      setError("Interested count cannot exceed eligible count.");
      return;
    }

    if (interested < 0 || eligible < 0) {
      setError("Student counts cannot be negative.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await upsertInterest(postingId, interested, eligible, resumePaths);

        if (!result.success) {
          setError(result.error);
          return;
        }

        setSaved(true);
      } catch {
        setError("Unable to save the interest count. Please try again.");
      }
    });
  }

  function handleEligibleChange(value: string) {
    const nextValue = Number(value);

    setEligible(Number.isNaN(nextValue) ? 0 : Math.max(0, nextValue));
    setSaved(false);
    setError(null);
  }

  function handleInterestedChange(value: string) {
    const nextValue = Number(value);

    setInterested(Number.isNaN(nextValue) ? 0 : Math.max(0, nextValue));
    setSaved(false);
    setError(null);
  }

  const invalid = interested > eligible;

  return (
    <form
      onSubmit={handleSubmit}
      className="card space-y-4 p-4 sm:p-5"
      aria-busy={isPending}
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Student interest
        </h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          Record how many students are eligible and interested in this posting.
        </p>
      </div>

      <label className="block text-sm">
        <span className="field-label">Eligible students</span>
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={eligible}
          onChange={(e) => handleEligibleChange(e.target.value)}
          disabled={isPending}
          aria-invalid={invalid}
          className="input-field"
        />
      </label>

      <div className="block text-sm">
        <span className="field-label">Student resumes</span>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Upload at least one PDF, DOC, or DOCX resume for the students you are reporting.
          Each file can be up to 10 MB.
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => void uploadResumes(event.target.files)}
          disabled={isPending || uploading}
          className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700"
        />
        <p className="mt-2 text-sm text-slate-600">{resumePaths.length} resume(s) attached</p>
      </div>

      <label className="block text-sm">
        <span className="field-label">Interested students</span>
        <input
          type="number"
          min={0}
          max={eligible}
          step={1}
          inputMode="numeric"
          value={interested}
          onChange={(e) => handleInterestedChange(e.target.value)}
          disabled={isPending}
          aria-invalid={invalid}
          className="input-field"
        />
      </label>

      {invalid && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-700"
        >
          Interested count cannot exceed eligible count.
        </p>
      )}

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || uploading || invalid || resumePaths.length === 0}
        className="btn-primary min-h-10 w-full"
      >
        {uploading ? "Uploading…" : isPending ? "Saving…" : existing ? "Update count" : "Log interest"}
      </button>

      <div
        role="status"
        aria-live="polite"
        className={`min-h-5 text-center text-sm font-medium ${
          saved ? "text-green-600" : "text-transparent"
        }`}
      >
        {saved ? "✓ Interest count saved successfully" : " "}
      </div>
    </form>
  );
}