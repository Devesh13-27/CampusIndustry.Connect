import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import { formatMonthYear } from "@/lib/utils";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import FadeInStagger from "@/components/reactbits/FadeInStagger";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import Icon from "@/components/Icon";

export default async function CompanyDashboard() {
  const profile = await requireVerifiedRole("hr");
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .single();

  const { data: postings } = await supabase
    .from("postings")
    .select("*, interest_reports(interested_count)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  type PostingWithInterest = NonNullable<typeof postings>[number];

  const interestByPosting = new Map<string, number>(
    (postings ?? []).map((p) => [
      p.id,
      ((p as PostingWithInterest).interest_reports ?? []).reduce(
        (sum: number, r: { interested_count: number }) => sum + r.interested_count,
        0,
      ),
    ]),
  );

  const openCount = (postings ?? []).filter((p) => p.status === "open").length;
  const campScheduledCount = (postings ?? []).filter((p) => p.status === "camp_scheduled").length;
  const totalInterested = Array.from(interestByPosting.values()).reduce((a, b) => a + b, 0);

  return (
    <div>
      <Nav
        orgName={company?.name ?? ""}
        links={[
          { href: "/company/dashboard", label: "Postings" },
          { href: "/calendar", label: "Calendar" },
        ]}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {!!postings?.length && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard
              label="Open postings"
              value={openCount}
              icon={<Icon name="briefcase" />}
              tone="green"
            />
            <StatCard
              label="Camps scheduled"
              value={campScheduledCount}
              icon={<Icon name="calendar" />}
              tone="blue"
            />
            <StatCard
              label="Total interested"
              value={totalInterested}
              icon={<Icon name="users" />}
            />
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Job Postings
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Your job postings...
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your openings and see which colleges are interested.
            </p>
          </div>

          <Link
            href="/company/postings/new"
            className="btn-primary w-full sm:w-auto"
          >
            <Icon name="plus" />
            New job posting
          </Link>
        </div>

        {!postings?.length && (
          <EmptyState
            icon={<Icon name="document" />}
            title="No job postings yet"
            description="Create one to start reaching colleges and see who's interested."
            action={
              <Link href="/company/postings/new" className="btn-primary">
                <Icon name="plus" />
                New posting
              </Link>
            }
          />
        )}

        <FadeInStagger className="space-y-3">
          {postings?.map((p) => (
            <Link key={p.id} href={`/company/postings/${p.id}`} className="card-interactive block p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{p.role_title}</p>
                  <p className="text-sm text-slate-500">
                    {p.branches.join(", ")} · {p.num_openings} openings ·{" "}
                    {formatMonthYear(p.target_start)} → {formatMonthYear(p.target_end)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-sm text-slate-500">
                    {interestByPosting.get(p.id) ?? 0} interested
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            </Link>
          ))}
        </FadeInStagger>
      </div>
    </div>
  );
}
