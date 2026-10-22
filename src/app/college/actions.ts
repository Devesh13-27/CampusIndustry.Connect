"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";

type ActionResult = { success: true } | { success: false; error: string };

export async function upsertInterest(
  postingId: string,
  interestedCount: number,
  eligibleCount: number,
): Promise<ActionResult> {
  if (interestedCount < 0 || eligibleCount < 0) {
    return { success: false, error: "Counts cannot be negative." };
  }
  if (interestedCount > eligibleCount) {
    return { success: false, error: "Interested count cannot exceed eligible count." };
  }

  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

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
): Promise<ActionResult> {
  if (!body.trim()) return { success: false, error: "Message cannot be empty." };

  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

  const { error } = await supabase.from("messages").insert({
    posting_id: postingId,
    college_id: profile.college_id,
    company_id: companyId,
    sender_id: profile.id,
    sender_role: "tp",
    body: body.trim(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/college/postings/${postingId}`);
  return { success: true };
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
