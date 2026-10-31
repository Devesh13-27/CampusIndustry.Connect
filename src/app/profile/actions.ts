"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

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
