"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";

type ActionResult = { success: true } | { success: false; error: string };

async function assertAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Not authorized.");
  }
}

export async function decideProfile(
  profileId: string,
  orgTable: "companies" | "colleges",
  orgId: string,
  decision: "verified" | "rejected",
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ verification_status: decision })
    .eq("id", profileId);

  if (profileError) return { success: false, error: profileError.message };

  if (decision === "verified") {
    const { error: orgError } = await supabase
      .from(orgTable)
      .update({ verification_status: "verified" })
      .eq("id", orgId);

    if (orgError) return { success: false, error: orgError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
    const adminProfile = await getCurrentProfile();
    if (!adminProfile || adminProfile.role !== "admin") {
      throw new Error("Not authorized.");
    }
    if (!userId || userId === adminProfile.id) {
      return { success: false, error: "You cannot delete your own admin account." };
    }

    const admin = createAdminClient();
    const { data: target, error: lookupError } = await admin
      .from("profiles")
      .select("id, profile_photo_path, resume_path")
      .eq("id", userId)
      .maybeSingle();

    if (lookupError) return { success: false, error: "Could not find that user." };
    if (!target) return { success: false, error: "User not found." };

    const storagePaths = [
      target.profile_photo_path
        ? admin.storage.from("profile-photos").remove([target.profile_photo_path])
        : Promise.resolve({ data: [], error: null }),
      target.resume_path
        ? admin.storage.from("resumes").remove([target.resume_path])
        : Promise.resolve({ data: [], error: null }),
    ];
    const storageResults = await Promise.all(storagePaths);
    const storageError = storageResults.find((result) => result.error)?.error;
    if (storageError) return { success: false, error: "Could not remove the user files." };

    const { data: postings, error: postingsError } = await admin
      .from("postings")
      .select("id")
      .eq("created_by", userId);
    if (postingsError) {
      return { success: false, error: "Could not load the user’s job postings." };
    }
    const postingIds = (postings ?? []).map((posting) => posting.id);

    if (postingIds.length) {
      const { error } = await admin.from("postings").delete().in("id", postingIds);
      if (error) return { success: false, error: "Could not remove the user’s job postings." };
    }

    const dependentDeletes = await Promise.all([
      admin.from("messages").delete().eq("sender_id", userId),
      admin.from("interest_reports").delete().eq("reported_by", userId),
      admin.from("camps_visits").delete().eq("created_by", userId),
    ]);
    const dependentError = dependentDeletes.find((result) => result.error)?.error;
    if (dependentError) return { success: false, error: "Could not remove the user’s activity." };

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/company/dashboard");
    revalidatePath("/college/dashboard");
    return { success: true };
}

export async function deleteAdminPosting(postingId: string): Promise<ActionResult> {
    await assertAdmin();
    if (!postingId) return { success: false, error: "Invalid posting." };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("postings")
      .delete()
      .eq("id", postingId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, error: "Could not delete the job opening." };
    if (!data) return { success: false, error: "Job opening not found." };

    revalidatePath("/admin");
    revalidatePath("/company/dashboard");
    return { success: true };
}

export async function deleteResume(profileId: string): Promise<ActionResult> {
    await assertAdmin();
    if (!profileId) return { success: false, error: "Invalid resume owner." };

    const admin = createAdminClient();
    const { data: target, error: lookupError } = await admin
      .from("profiles")
      .select("resume_path")
      .eq("id", profileId)
      .maybeSingle();

    if (lookupError) return { success: false, error: "Could not find that resume." };
    if (!target?.resume_path) return { success: false, error: "Resume not found." };

    const { error: storageError } = await admin.storage
      .from("resumes")
      .remove([target.resume_path]);
    if (storageError) return { success: false, error: "Could not delete the resume file." };

    const { error } = await admin
      .from("profiles")
      .update({ resume_path: null })
      .eq("id", profileId);
    if (error) return { success: false, error: "Could not clear the resume record." };

    revalidatePath("/admin");
    revalidatePath("/profile");
    return { success: true };
}
