import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import { formatMonthYear } from "@/lib/utils";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import StatusSelect from "./StatusSelect";
import ThreadPanel from "./ThreadPanel";
import type { InterestReport, Message, CampVisit } from "@/lib/types";

type InterestWithCollege = InterestReport & {
  colleges: { id: string; name: string; city: string | null };
};

export default async function CompanyPostingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ college?: string }>;
}) {
  const { id } = await params;
  const { college: selectedCollegeId } = await searchParams;

  const profile = await requireVerifiedRole("hr");
  const supabase = await createClient();

  const { data: posting } = await supabase
    .from("postings")
    .select("*")
    .eq("id", id)
    .single();

  if (!posting || posting.company_id !== profile.company_id) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", posting.company_id)
    .single();

  const { data: interests } = await supabase
    .from("interest_reports")
    .select("*, colleges(id, name, city)")
    .eq("posting_id", id)
    .order("interested_count", { ascending: false })
    .returns<InterestWithCollege[]>();

  let messages: Message[] = [];
  let camp: CampVisit | null = null;
  if (selectedCollegeId) {
    const [{ data: msgs }, { data: camps }] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("posting_id", id)
        .eq("college_id", selectedCollegeId)
        .order("created_at", { ascending: true }),
      supabase
        .from("camps_visits")
        .select("*")
        .eq("posting_id", id)
        .eq("college_id", selectedCollegeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    messages = msgs ?? [];
    camp = camps;
  }

  return (
    <div>
      <Nav
        orgName={company?.name ?? ""}
        links={[
          { href: "/company/dashboard", label: "Postings" },
          { href: "/calendar", label: "Calendar" },
        ]}
      />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/company/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← All postings
        </Link>

        <div className="mt-3 flex flex-col gap-4 card p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{posting.role_title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {posting.branches.join(", ")} · {posting.num_openings} openings ·{" "}
              {formatMonthYear(posting.target_start)} → {formatMonthYear(posting.target_end)}
            </p>
            {posting.description && (
              <p className="mt-2 max-w-xl text-sm text-slate-600">{posting.description}</p>
            )}
          </div>
          <StatusSelect postingId={posting.id} status={posting.status} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Colleges reporting interest ({interests?.length ?? 0})
            </h2>
            {!interests?.length && (
              <EmptyState
                icon={<Icon name="academicCap" />}
                title="No interest yet"
                description="Once a T&P officer logs interest, they'll show up here."
              />
            )}
            {interests?.map((row) => (
              <Link
                key={row.id}
                href={`/company/postings/${posting.id}?college=${row.college_id}`}
                className={
                  selectedCollegeId === row.college_id
                    ? "block rounded-xl border-2 border-blue-500 bg-blue-50/50 p-3"
                    : "card-interactive block p-3"
                }
              >
                <p className="font-medium text-slate-900">{row.colleges.name}</p>
                <p className="text-sm text-slate-500">{row.colleges.city}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {row.interested_count} interested · {row.eligible_count} eligible
                </p>
              </Link>
            ))}
          </div>

          <div className="md:col-span-3">
            {selectedCollegeId ? (
              <ThreadPanel
                postingId={posting.id}
                companyId={posting.company_id}
                collegeId={selectedCollegeId}
                collegeName={
                  interests?.find((r) => r.college_id === selectedCollegeId)?.colleges
                    .name ?? ""
                }
                initialMessages={messages}
                camp={camp}
              />
            ) : (
              <EmptyState
                icon={<Icon name="academicCap" />}
                title="No college selected"
                description="Select a college from the list to message them or schedule a recruitment camp."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
