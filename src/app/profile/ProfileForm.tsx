"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FormField from "@/components/FormField";
import StarBorder from "@/components/reactbits/StarBorder";
import { saveProfile } from "./actions";
import type { Profile } from "@/lib/types";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [photoPath, setPhotoPath] = useState(profile.profile_photo_path ?? "");
  const [resumePath, setResumePath] = useState(profile.resume_path ?? "");
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadPhoto(file: File) {
    setPhotoError(null);
    setSaved(false);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Profile photos must be 5 MB or smaller.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) {
      setPhotoError("Could not upload the photo. Please try again.");
      return;
    }
    setPhotoPath(path);
  }

  async function uploadResume(file: File) {
    setResumeError(null);
    setSaved(false);
    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (!allowedTypes.has(file.type)) {
      setResumeError("Choose a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeError("Resumes must be 10 MB or smaller.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) {
      setResumeError("Could not upload the resume. Please try again.");
      return;
    }
    setResumePath(path);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setFormError(null);

    const result = await saveProfile(new FormData(event.currentTarget));
    if (!result.success) {
      setFormError(result.error);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="profile_photo_path" value={photoPath} />
      <input type="hidden" name="resume_path" value={resumePath} />

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Basic information</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" name="full_name" value={profile.full_name} disabled />
          <FormField label="Phone number" name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder="+91 98765 43210" />
          <FormField label="Alternate email" name="alternate_email" type="email" defaultValue={profile.alternate_email ?? ""} />
          <FormField label="Designation" name="designation" defaultValue={profile.designation ?? ""} placeholder={profile.role === "hr" ? "e.g. Talent Acquisition Manager" : "e.g. Training and Placement Officer"} />
          <div className="block text-sm">
            <label htmlFor="gender" className="field-label">Gender</label>
            <select id="gender" name="gender" defaultValue={profile.gender ?? ""} className="input-field mt-1">
              <option value="">Prefer not to specify</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Resume</h2>
        <p className="mt-1 text-xs text-slate-500">Private to you and administrators. PDF, DOC, or DOCX up to 10 MB.</p>
        {resumePath && <p className="mt-2 text-sm text-green-700">Resume uploaded.</p>}
        <input className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); }} />
        {resumeError && <p role="alert" className="mt-1.5 text-sm text-red-600">{resumeError}</p>}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">
          {profile.role === "hr" ? "Company information" : "T&P information"}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField label={profile.role === "hr" ? "LinkedIn profile" : "LinkedIn profile"} name="linkedin_url" type="url" defaultValue={profile.linkedin_url ?? ""} placeholder="https://linkedin.com/in/your-name" />
          {profile.role === "hr" ? (
            <>
              <FormField label="Hiring authority" name="hiring_authority" defaultValue={profile.hiring_authority ?? ""} placeholder="e.g. Primary hiring contact" />
              <FormField label="Office location" name="office_location" defaultValue={profile.office_location ?? ""} placeholder="City or office address" />
            </>
          ) : (
            <>
              <FormField label="T&P department / cell" name="department" defaultValue={profile.department ?? ""} />
              <FormField label="T&P office phone" name="office_phone" type="tel" defaultValue={profile.office_phone ?? ""} />
              <FormField label="Programs / branches handled" name="programs_branches" defaultValue={profile.programs_branches ?? ""} placeholder="e.g. CSE, ECE, MBA" />
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Profile photo</h2>
        <p className="mt-1 text-xs text-slate-500">Private to you and administrators. JPG, PNG, or WebP up to 5 MB.</p>
        <input className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); }} />
        {photoError && <p role="alert" className="mt-1.5 text-sm text-red-600">{photoError}</p>}
      </section>

      {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      {saved && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Profile saved.</p>}

      <StarBorder type="submit" disabled={saving || Boolean(photoError) || Boolean(resumeError)} aria-busy={saving}>
        {saving ? "Saving profile…" : "Save profile"}
      </StarBorder>
    </form>
  );
}
