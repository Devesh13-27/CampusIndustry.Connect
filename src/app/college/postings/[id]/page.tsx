import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import Nav from "@/components/Nav";
import StatusBadge from "@/components/StatusBadge";
import InterestForm from "./InterestForm";
import TpThreadPanel from "./TpThreadPanel";
import type { Posting } from "@/lib/types";

type PostingWithCompany = Posting & { companies: { name: string } | null };

export default async function CollegePostingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireVerifiedRole("tp");
  if (!profile.college_id) notFound();
  const supabase = await createClient();

  const { data: posting } = await supabase
    .from("postings")
    .select("*, companies(name)")
    .eq("id", id)
    .single<PostingWithCompany>();

  if (!posting) notFound();

  const { data: college } = await supabase
    .from("colleges")
    .select("name")
    .eq("id", profile.college_id)
    .single();

  const [{ data: myInterest }, { data: messages }, { data: camp }] = await Promise.all([
    supabase
      .from("interest_reports")
      .select("*")
      .eq("posting_id", id)
      .eq("college_id", profile.college_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("posting_id", id)
      .eq("college_id", profile.college_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("camps_visits")
      .select("*")
      .eq("posting_id", id)
      .eq("college_id", profile.college_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div>
      <Nav
        orgName={college?.name ?? ""}
        links={[
          { href: "/college/dashboard", label: "Job Postings" },
          { href: "/college/camps", label: "Recruitment Activities" },
        ]}
      />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/college/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← All job postings
        </Link>

        <div className="mt-3 flex flex-col gap-4 card p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {posting.role_title}{" "}
              <span className="font-normal text-slate-500">
                · {posting.companies?.name}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {posting.branches.join(", ")} · {posting.num_openings} openings ·{" "}
              {posting.target_start} → {posting.target_end}
            </p>
            {posting.description && (
              <p className="mt-2 max-w-xl text-sm text-slate-600">{posting.description}</p>
            )}
          </div>
          <div className="shrink-0 self-start">
            <StatusBadge status={posting.status} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              Your college&apos;s interest
            </h2>
            <InterestForm postingId={posting.id} existing={myInterest} />
          </div>

          <div className="min-h-0 md:col-span-3">
            <TpThreadPanel
              postingId={posting.id}
              collegeId={profile.college_id}
              companyId={posting.company_id}
              initialMessages={messages ?? []}
              camp={camp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
