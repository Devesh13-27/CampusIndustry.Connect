"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";

type ActionResult = { success: true } | { success: false; error: string };
export type Member = {
  id: string;
  full_name: string;
  email: string;
  role: "hr" | "tp";
  created_at: string;
};

const profileFields = [
  "phone",
  "alternate_email",
  "profile_photo_path",
  "resume_path",
  "gender",
  "designation",
  "department",
  "linkedin_url",
  "hiring_authority",
  "office_location",
  "office_phone",
  "programs_branches",
] as const;

function value(formData: FormData, field: (typeof profileFields)[number]) {
  const raw = formData.get(field);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be logged in." };

  const photoPath = value(formData, "profile_photo_path");
  if (photoPath && !photoPath.startsWith(`${user.id}/`)) {
    return { success: false, error: "Invalid profile photo." };
  }

  const resumePath = value(formData, "resume_path");
  if (resumePath && !resumePath.startsWith(`${user.id}/`)) {
    return { success: false, error: "Invalid resume." };
  }

  const payload = Object.fromEntries(
    profileFields.map((field) => [field, value(formData, field)]),
  );

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) return { success: false, error: "Could not save your profile." };

  revalidatePath("/profile");
  revalidatePath("/pending");
  revalidatePath("/company/dashboard");
  revalidatePath("/college/dashboard");
  return { success: true };
}

export async function addOrganizationMember(formData: FormData): Promise<ActionResult> {
  const owner = await getCurrentProfile();
  if (!owner || owner.role === "admin" || !owner.is_primary) {
    return { success: false, error: "Only the primary organization account can add members." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email || !password) {
    return { success: false, error: "Name, email, and temporary password are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { success: false, error: "Temporary password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const orgColumn = owner.role === "hr" ? "company_id" : "college_id";
  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq(orgColumn, owner[orgColumn])
    .eq("is_primary", false);
  if (countError) return { success: false, error: "Could not check the member limit." };
  if ((count ?? 0) >= 2) {
    return { success: false, error: "You can add up to 2 organization members." };
  }

  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (userError || !newUser.user) {
    return { success: false, error: userError?.message ?? "Could not create the member account." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUser.user.id,
    full_name: fullName,
    email,
    role: owner.role,
    is_primary: false,
    company_id: owner.role === "hr" ? owner.company_id : null,
    college_id: owner.role === "tp" ? owner.college_id : null,
    verification_status: "verified",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { success: false, error: "Could not create the member profile." };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function removeOrganizationMember(memberId: string): Promise<ActionResult> {
  const owner = await getCurrentProfile();
  if (!owner || owner.role === "admin" || !owner.is_primary) {
    return { success: false, error: "Only the primary organization account can remove members." };
  }
  if (!memberId || memberId === owner.id) {
    return { success: false, error: "Invalid organization member." };
  }

  const admin = createAdminClient();
  const orgColumn = owner.role === "hr" ? "company_id" : "college_id";
  const { data: member, error: lookupError } = await admin
    .from("profiles")
    .select("id, profile_photo_path, resume_path")
    .eq("id", memberId)
    .eq(orgColumn, owner[orgColumn])
    .eq("is_primary", false)
    .maybeSingle();
  if (lookupError) return { success: false, error: "Could not find that member." };
  if (!member) return { success: false, error: "Member not found in your organization." };

  const storageDeletes = await Promise.all([
    member.profile_photo_path
      ? admin.storage.from("profile-photos").remove([member.profile_photo_path])
      : Promise.resolve({ error: null }),
    member.resume_path
      ? admin.storage.from("resumes").remove([member.resume_path])
      : Promise.resolve({ error: null }),
  ]);
  if (storageDeletes.some((result) => result.error)) {
    return { success: false, error: "Could not remove the member files." };
  }

  const { error } = await admin.auth.admin.deleteUser(member.id);
  if (error) return { success: false, error: "Could not remove the member account." };

  revalidatePath("/profile");
  return { success: true };
}
