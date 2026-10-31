import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import Nav from "@/components/Nav";
import ProfileForm from "./ProfileForm";
import OrganizationMembers from "./OrganizationMembers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileCompletion } from "@/lib/profile-completion";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createAdminClient();
  const completion = getProfileCompletion(profile);
  const orgColumn = profile.role === "hr" ? "company_id" : profile.role === "tp" ? "college_id" : null;
  const { data: members } = orgColumn
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq(orgColumn, profile[orgColumn])
        .eq("is_primary", false)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div>
      <Nav orgName={profile.full_name} role={profile.role} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Account</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Your profile</h1>
          <p className="mt-1 text-sm text-slate-500">Keep your contact details current so the right people can reach you.</p>
        </div>
        <div className="card p-5 sm:p-8">
          <section aria-labelledby="profile-completion-heading" className="mb-8 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-completion-heading" className="text-sm font-semibold text-slate-900">
                  Profile completeness
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {completion.completed} of {completion.total} details completed
                  {completion.missing.length ? ` · Add ${completion.missing[0].toLowerCase()} next` : " · Your profile is complete"}
                </p>
              </div>
              <span className="text-2xl font-bold text-blue-700">{completion.percentage}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.percentage} aria-label={`Profile ${completion.percentage}% complete`}>
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${completion.percentage}%` }} />
            </div>
            {completion.missing.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Missing: {completion.missing.join(", ")}
              </p>
            )}
          </section>
          <ProfileForm profile={profile} />
          {orgColumn && (
            <OrganizationMembers
              members={members ?? []}
              canManage={profile.is_primary}
            />
          )}
        </div>
      </main>
    </div>
  );
}
