import { createClient } from "@/lib/supabase/server";
import { requireVerifiedRole } from "@/lib/guards";
import Nav from "@/components/Nav";
import CalendarView, { type CalendarEvent } from "@/components/CalendarView";

export default async function CalendarPage() {
  const profile = await requireVerifiedRole(["hr", "tp"]);
  const supabase = await createClient();

  const { data: organization } = profile.role === "hr"
    ? await supabase.from("companies").select("name").eq("id", profile.company_id).single()
    : await supabase.from("colleges").select("name").eq("id", profile.college_id).single();

  const { data: camps } = await supabase
    .from("camps_visits")
    .select("id, posting_id, type, scheduled_date, status, postings(role_title), colleges(name), companies(name)")
    .eq(profile.role === "hr" ? "company_id" : "college_id", profile.role === "hr" ? profile.company_id : profile.college_id)
    .order("scheduled_date", { ascending: true });

  const events: CalendarEvent[] = (camps ?? []).map((camp) => {
    const posting = Array.isArray(camp.postings) ? camp.postings[0] : camp.postings;
    const college = Array.isArray(camp.colleges) ? camp.colleges[0] : camp.colleges;
    const company = Array.isArray(camp.companies) ? camp.companies[0] : camp.companies;
    return {
      id: camp.id,
      date: camp.scheduled_date,
      title: camp.type === "camp" ? "Recruitment camp" : "Industry visit",
      subtitle: `${posting?.role_title ?? "Job opening"} · ${profile.role === "hr" ? college?.name ?? "College" : company?.name ?? "Company"}`,
      href: profile.role === "hr" ? `/company/postings/${camp.posting_id}` : "/college/camps",
      status: camp.status,
    };
  });

  return (
    <div>
      <Nav
        orgName={organization?.name ?? ""}
        links={[{ href: profile.role === "hr" ? "/company/dashboard" : "/college/dashboard", label: "Dashboard" }, { href: "/calendar", label: "Calendar" }]}
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Schedule</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Camps &amp; visits calendar</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Keep track of proposed and confirmed recruitment activities.</p>
        <CalendarView events={events} />
      </main>
    </div>
  );
}
