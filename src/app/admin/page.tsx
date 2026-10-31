import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import FadeInStagger from "@/components/reactbits/FadeInStagger";
import Icon from "@/components/Icon";
import ApprovalRow from "./ApprovalRow";
import AdminDeleteButton from "./AdminDeleteButton";
import type { Company, College } from "@/lib/types";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const supabase = await createClient();

  const [{ data: pendingProfiles }, { data: profiles }, { data: postings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, verification_status, created_at, resume_path")
      .neq("id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("postings")
      .select("id, role_title, status, created_at, companies(name)")
      .order("created_at", { ascending: false }),
  ]);

  const companyIds = (pendingProfiles ?? [])
    .filter((p) => p.company_id)
    .map((p) => p.company_id);
  const collegeIds = (pendingProfiles ?? [])
    .filter((p) => p.college_id)
    .map((p) => p.college_id);

  const [{ data: companies }, { data: colleges }] = await Promise.all([
    companyIds.length
      ? supabase.from("companies").select("*").in("id", companyIds)
      : Promise.resolve({ data: [] as Company[] }),
    collegeIds.length
      ? supabase.from("colleges").select("*").in("id", collegeIds)
      : Promise.resolve({ data: [] as College[] }),
  ]);

  const companyMap = new Map((companies ?? []).map((c) => [c.id, c]));
  const collegeMap = new Map((colleges ?? []).map((c) => [c.id, c]));

  return (
    <div>
      <Nav orgName="Admin" role="admin" />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900">Verification queue</h1>
          <p className="text-sm text-slate-500">
            Approve or reject new T&amp;P and HR signups.
          </p>
        </div>

        {!pendingProfiles?.length && (
          <EmptyState
            icon={<Icon name="check" />}
            title="Nothing pending"
            description="All signups are caught up."
          />
        )}

        <FadeInStagger className="space-y-3">
          {pendingProfiles?.map((p) => {
            const org = p.role === "hr" ? companyMap.get(p.company_id) : collegeMap.get(p.college_id);
            return (
              <ApprovalRow
                key={p.id}
                profile={p}
                orgTable={p.role === "hr" ? "companies" : "colleges"}
                orgName={org?.name ?? "Unknown org"}
                orgDomain={org?.domain ?? ""}
                orgId={org?.id}
              />
            );
          })}
        </FadeInStagger>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900">Manage users</h2>
          <p className="mt-1 text-sm text-slate-500">Delete accounts and their related activity.</p>
          <div className="mt-4 space-y-3">
            {!profiles?.length && <EmptyState icon={<Icon name="users" />} title="No other users" description="There are no user accounts to manage." />}
            {profiles?.map((user) => (
              <div key={user.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-sm text-slate-500">{user.email} · {user.role} · {user.verification_status}</p>
                </div>
                <AdminDeleteButton kind="user" id={user.id} label={user.full_name} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900">Manage job openings</h2>
          <p className="mt-1 text-sm text-slate-500">Remove job openings and their related conversations and interest reports.</p>
          <div className="mt-4 space-y-3">
            {!postings?.length && <EmptyState icon={<Icon name="briefcase" />} title="No job openings" description="There are no job openings to manage." />}
            {postings?.map((posting) => {
              const company = Array.isArray(posting.companies) ? posting.companies[0] : posting.companies;
              return (
                <div key={posting.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{posting.role_title}</p>
                    <p className="text-sm text-slate-500">{company?.name ?? "Unknown company"} · {posting.status}</p>
                  </div>
                  <AdminDeleteButton kind="posting" id={posting.id} label={posting.role_title} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900">Manage resumes</h2>
          <p className="mt-1 text-sm text-slate-500">Delete uploaded resumes without deleting the user account.</p>
          <div className="mt-4 space-y-3">
            {!(profiles ?? []).some((user) => user.resume_path) && <EmptyState icon={<Icon name="document" />} title="No resumes" description="No users have uploaded a resume." />}
            {profiles?.filter((user) => user.resume_path).map((user) => (
              <div key={user.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <AdminDeleteButton kind="resume" id={user.id} label={`${user.full_name}'s resume`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
