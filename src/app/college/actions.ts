"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import type { Message } from "@/lib/types";

type ActionResult = { success: true } | { success: false; error: string };
type MessageActionResult =
  | { success: true; message: Message }
  | { success: false; error: string };

export async function upsertInterest(
  postingId: string,
  interestedCount: number,
  eligibleCount: number,
  resumePaths: string[],
): Promise<ActionResult> {
  if (interestedCount < 0 || eligibleCount < 0) {
    return { success: false, error: "Counts cannot be negative." };
  }
  if (interestedCount > eligibleCount) {
    return { success: false, error: "Interested count cannot exceed eligible count." };
  }

  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();
  const paths = [...new Set(resumePaths)];
  if (paths.length === 0) {
    return { success: false, error: "Upload at least one student resume before showing interest." };
  }
  if (
    paths.some(
      (path) =>
        !path.startsWith(`${profile.id}/jobs/${postingId}/`) ||
        path.split("/").length !== 4,
    )
  ) {
    return { success: false, error: "One or more resumes are invalid for this job." };
  }

  const { data: posting } = await supabase
    .from("postings")
    .select("id")
    .eq("id", postingId)
    .maybeSingle();
  if (!posting) return { success: false, error: "Job posting not found." };

  const { data: existingResumes, error: resumeLookupError } = await supabase
    .from("job_resumes")
    .select("id, file_path")
    .eq("posting_id", postingId)
    .eq("college_id", profile.college_id);
  if (resumeLookupError) return { success: false, error: resumeLookupError.message };

  const existingByPath = new Map(
    (existingResumes ?? []).map((resume) => [resume.file_path, resume.id]),
  );
  const newPaths = paths.filter((path) => !existingByPath.has(path));
  if (newPaths.length > 0) {
    const { error: resumeInsertError } = await supabase.from("job_resumes").insert(
      newPaths.map((filePath) => ({
        posting_id: postingId,
        college_id: profile.college_id,
        uploaded_by: profile.id,
        file_path: filePath,
        file_name: filePath.split("/").pop() ?? "resume",
        content_type: "application/octet-stream",
        file_size: 0,
      })),
    );
    if (resumeInsertError) return { success: false, error: resumeInsertError.message };
  }

  const { error } = await supabase.from("interest_reports").upsert(
    {
      posting_id: postingId,
      college_id: profile.college_id,
      reported_by: profile.id,
      interested_count: interestedCount,
      eligible_count: eligibleCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "posting_id,college_id" },
  );

  if (error) return { success: false, error: error.message };

  revalidatePath(`/college/postings/${postingId}`);
  revalidatePath("/college/dashboard");
  return { success: true };
}

export async function sendMessageAsTp(
  postingId: string,
  companyId: string,
  body: string,
): Promise<MessageActionResult> {
  if (!body.trim()) return { success: false, error: "Message cannot be empty." };

  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      posting_id: postingId,
      college_id: profile.college_id,
      company_id: companyId,
      sender_id: profile.id,
      sender_role: "tp",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Unable to read the sent message." };

  revalidatePath(`/college/postings/${postingId}`);
  return { success: true, message: data as Message };
}

export async function confirmCamp(campId: string): Promise<ActionResult> {
  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

  const { error } = await supabase
    .from("camps_visits")
    .update({ status: "confirmed" })
    .eq("id", campId)
    .eq("college_id", profile.college_id)
    .eq("status", "proposed");

  if (error) return { success: false, error: error.message };

  revalidatePath("/college/camps");
  return { success: true };
}

export async function cancelCamp(campId: string): Promise<ActionResult> {
  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

  const { error } = await supabase
    .from("camps_visits")
    .update({ status: "cancelled" })
    .eq("id", campId)
    .eq("college_id", profile.college_id)
    .in("status", ["proposed", "confirmed"]);

  if (error) return { success: false, error: error.message };

  revalidatePath("/college/camps");
  return { success: true };
}
