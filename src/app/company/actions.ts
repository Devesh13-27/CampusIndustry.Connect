"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import type { Message, PostingStatus } from "@/lib/types";

const PostingSchema = z.object({
  roleTitle: z.string().min(2, "Role title must be at least 2 characters"),
  branches: z
    .string()
    .min(1, "At least one branch is required")
    .transform((val) => val.split(",").map((b) => b.trim()).filter(Boolean)),
  numOpenings: z.coerce
    .number()
    .int()
    .min(1, "Must have at least 1 opening"),
  targetStart: z.string().min(1, "Start date is required"),
  targetEnd: z.string().min(1, "End date is required"),
  description: z.string().optional(),
}).refine(
  (data) => !data.targetEnd || !data.targetStart || data.targetEnd >= data.targetStart,
  { message: "End date must be after start date", path: ["targetEnd"] },
);

type ActionResult = { success: true } | { success: false; error: string };
type MessageActionResult =
  | { success: true; message: Message }
  | { success: false; error: string };

export async function createPosting(formData: FormData): Promise<ActionResult> {
  const profile = await requireVerifiedRole("hr");
  const supabase = await createClient();

  const raw = {
    roleTitle: formData.get("roleTitle"),
    branches: formData.get("branches"),
    numOpenings: formData.get("numOpenings"),
    targetStart: formData.get("targetStart"),
    targetEnd: formData.get("targetEnd"),
    description: formData.get("description") || undefined,
  };

  const parsed = PostingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input." };
  }

  const { roleTitle, branches, numOpenings, targetStart, targetEnd, description } = parsed.data;

  const { error } = await supabase.from("postings").insert({
    company_id: profile.company_id,
    created_by: profile.id,
    role_title: roleTitle,
    branches,
    num_openings: numOpenings,
    target_start: targetStart,
    target_end: targetEnd,
    description: description ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/company/dashboard");
  return { success: true };
}

export async function updatePostingStatus(postingId: string, status: PostingStatus): Promise<ActionResult> {
  await requireVerifiedRole("hr");
  const supabase = await createClient();

  const { error } = await supabase
    .from("postings")
    .update({ status })
    .eq("id", postingId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/company/postings/${postingId}`);
  revalidatePath("/company/dashboard");
  return { success: true };
}

export async function sendMessageAsHr(
  postingId: string,
  companyId: string,
  collegeId: string,
  body: string,
): Promise<MessageActionResult> {
  if (!body.trim()) return { success: false, error: "Message cannot be empty." };

  const profile = await requireVerifiedRole("hr");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      posting_id: postingId,
      college_id: collegeId,
      company_id: companyId,
      sender_id: profile.id,
      sender_role: "hr",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Unable to read the sent message." };

  revalidatePath(`/company/postings/${postingId}`);
  return { success: true, message: data as Message };
}

export async function proposeCamp(
  postingId: string,
  companyId: string,
  collegeId: string,
  type: "camp" | "visit",
  scheduledDate: string,
): Promise<ActionResult> {
  if (!scheduledDate) return { success: false, error: "A date is required." };

  const profile = await requireVerifiedRole("hr");
  const supabase = await createClient();

  // One active camp/visit per posting+college — re-proposing updates instead of duplicating.
  const { data: existing } = await supabase
    .from("camps_visits")
    .select("id")
    .eq("posting_id", postingId)
    .eq("college_id", collegeId)
    .in("status", ["proposed", "confirmed"])
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("camps_visits")
        .update({ type, scheduled_date: scheduledDate, status: "proposed" })
        .eq("id", existing.id)
    : await supabase.from("camps_visits").insert({
        posting_id: postingId,
        company_id: companyId,
        college_id: collegeId,
        type,
        scheduled_date: scheduledDate,
        created_by: profile.id,
      });

  if (error) return { success: false, error: error.message };

  await supabase.from("postings").update({ status: "camp_scheduled" }).eq("id", postingId);

  revalidatePath(`/company/postings/${postingId}`);
  return { success: true };
}

export async function cancelCamp(campId: string, postingId: string): Promise<ActionResult> {
  const profile = await requireVerifiedRole("hr");
  const supabase = await createClient();

  const { error } = await supabase
    .from("camps_visits")
    .update({ status: "cancelled" })
    .eq("id", campId)
    .eq("posting_id", postingId)
    .eq("company_id", profile.company_id)
    .in("status", ["proposed", "confirmed"]);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/company/postings/${postingId}`);
  revalidatePath("/company/dashboard");
  return { success: true };
}
