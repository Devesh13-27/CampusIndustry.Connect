import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import FadeInStagger from "@/components/reactbits/FadeInStagger";
import Icon from "@/components/Icon";
import ApprovalRow from "./ApprovalRow";
import type { Company, College } from "@/lib/types";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const supabase = await createClient();

  const { data: pendingProfiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

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
      </div>
    </div>
  );
}
