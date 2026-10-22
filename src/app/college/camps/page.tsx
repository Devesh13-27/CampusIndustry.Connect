import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import Nav from "@/components/Nav";
import EmptyState from "@/components/EmptyState";
import FadeInStagger from "@/components/reactbits/FadeInStagger";
import Icon from "@/components/Icon";
import { CAMP_STATUS_LABEL } from "@/lib/statusStyles";
import { formatDate } from "@/lib/utils";
import ConfirmButton from "./ConfirmButton";
import type { CampVisit } from "@/lib/types";

type CampWithRefs = CampVisit & {
  postings: { role_title: string } | null;
  companies: { name: string } | null;
};

export default async function CollegeCampsPage() {
  const profile = await requireVerifiedRole("tp");
  const supabase = await createClient();

  const { data: college } = await supabase
    .from("colleges")
    .select("name")
    .eq("id", profile.college_id)
    .single();

  const { data: camps } = await supabase
    .from("camps_visits")
    .select("*, postings(role_title), companies(name)")
    .eq("college_id", profile.college_id)
    .order("scheduled_date", { ascending: true })
    .returns<CampWithRefs[]>();

  return (
    <div>
      <Nav
        orgName={college?.name ?? ""}
        links={[
          { href: "/college/dashboard", label: "Openings" },
          { href: "/college/camps", label: "Camps & visits" },
          { href: "/calendar", label: "Calendar" },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          Upcoming camps &amp; visits
        </h1>

        {!camps?.length && (
          <EmptyState
            icon={<Icon name="calendar" />}
            title="Nothing scheduled yet"
            description="Once you and a company agree on a camp or visit, it'll be tracked here."
          />
        )}

        <FadeInStagger className="space-y-3">
          {camps?.map((c) => (
            <div key={c.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {c.type === "camp" ? "Recruitment camp" : "Industry visit"} ·{" "}
                  {c.companies?.name}
                </p>
                <p className="text-sm text-slate-500">
                  {c.postings?.role_title} · {formatDate(c.scheduled_date)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium text-slate-600">
                  {CAMP_STATUS_LABEL[c.status]}
                </span>
                {["proposed", "confirmed"].includes(c.status) && (
                  <ConfirmButton campId={c.id} status={c.status} />
                )}
              </div>
            </div>
          ))}
        </FadeInStagger>
      </div>
    </div>
  );
}
