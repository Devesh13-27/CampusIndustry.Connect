import type { Profile } from "./types";

type CompletionField = {
  label: string;
  value: string | null | undefined;
};

function fieldsForProfile(profile: Profile): CompletionField[] {
  const fields: CompletionField[] = [
    { label: "Full name", value: profile.full_name },
    { label: "Phone number", value: profile.phone },
    { label: "Alternate email", value: profile.alternate_email },
    { label: "Designation", value: profile.designation },
    { label: "Gender", value: profile.gender },
    { label: "LinkedIn profile", value: profile.linkedin_url },
    { label: "Profile photo", value: profile.profile_photo_path },
    { label: "Resume", value: profile.resume_path },
  ];

  if (profile.role === "hr") {
    fields.push(
      { label: "Hiring authority", value: profile.hiring_authority },
      { label: "Office location", value: profile.office_location },
    );
  } else if (profile.role === "tp") {
    fields.push(
      { label: "T&P department / cell", value: profile.department },
      { label: "T&P office phone", value: profile.office_phone },
      { label: "Programs / branches handled", value: profile.programs_branches },
    );
  }

  return fields;
}

export function getProfileCompletion(profile: Profile) {
  const fields = fieldsForProfile(profile);
  const completed = fields.filter(({ value }) => Boolean(value?.trim())).length;

  return {
    percentage: Math.round((completed / fields.length) * 100),
    completed,
    total: fields.length,
    missing: fields.filter(({ value }) => !value?.trim()).map(({ label }) => label),
  };
}
