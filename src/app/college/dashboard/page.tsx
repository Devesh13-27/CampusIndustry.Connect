import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import Icon from "@/components/Icon";
import JobPostingFilters from "./JobPostingFilters";
import type { Posting } from "@/lib/types";

type PostingWithCompany = Posting & { companies: { name: string } | null };

export default async function CollegeDashboard() {
  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

  const { data: college } = await supabase
    .from("colleges")
    .select("name")
    .eq("id", profile.college_id)
    .single();

  const { data: postings } = await supabase
    .from("postings")
    .select("*, companies(name)")
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .returns<PostingWithCompany[]>();

  const { data: myInterests } = await supabase
    .from("interest_reports")
    .select("posting_id, interested_count, eligible_count")
    .eq("college_id", profile.college_id);

  const { count: upcomingCampsCount } = await supabase
    .from("camps_visits")
    .select("id", { count: "exact", head: true })
    .eq("college_id", profile.college_id)
    .in("status", ["proposed", "confirmed"]);

  const interestMap = new Map((myInterests ?? []).map((r) => [r.posting_id, r]));
  const interestByPosting = Object.fromEntries(interestMap);
  const totalInterestLogged = (myInterests ?? []).reduce((sum, r) => sum + r.interested_count, 0);

  return (
    <div>
      <Nav
        orgName={college?.name ?? ""}
        links={[
          { href: "/college/dashboard", label: "Job Postings" },
          { href: "/college/camps", label: "Recruitment Activities" },
          { href: "/calendar", label: "Calendar" },
        ]}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {!!postings?.length && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard
              label="Open job postings"
              value={postings.length}
              icon={<Icon name="briefcase" />}
              tone="green"
            />
            <StatCard
              label="Interest logged"
              value={totalInterestLogged}
              icon={<Icon name="users" />}
            />
            <StatCard
              label="Upcoming camps"
              value={upcomingCampsCount ?? 0}
              icon={<Icon name="calendar" />}
              tone="blue"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Opportunities
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Relevant openings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Browse active opportunities from companies and log your college&apos;s
            interest.
          </p>
        </div>

        {!postings?.length && (
          <EmptyState
            icon={<Icon name="inbox" />}
            title="No openings posted yet"
            description="Once a company posts a hiring opening, it'll show up here for you to log interest against."
          />
        )}

        {!!postings?.length && (
          <JobPostingFilters postings={postings} interestByPosting={interestByPosting} />
        )}
      </div>
    </div>
  );
}
