import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { NotificationItem } from "@/lib/notifications";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.verification_status !== "verified") {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  const supabase = await createClient();
  const today = new Date();
  const reminderEnd = new Date(today);
  reminderEnd.setDate(reminderEnd.getDate() + 7);
  const recentOpeningDate = new Date(today);
  recentOpeningDate.setDate(recentOpeningDate.getDate() - 14);

  const notifications: NotificationItem[] = [];
  const postingQuery = supabase
    .from("postings")
    .select("id, role_title, company_id, created_at, companies(name)")
    .neq("status", "closed")
    .gte("created_at", recentOpeningDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  const campsQuery = supabase
    .from("camps_visits")
    .select("id, posting_id, type, scheduled_date, status, postings(role_title), colleges(name), companies(name)")
    .in("status", ["proposed", "confirmed"])
    .gte("scheduled_date", dateOnly(today))
    .lte("scheduled_date", dateOnly(reminderEnd))
    .order("scheduled_date", { ascending: true })
    .limit(30);

  const messagesQuery = supabase
    .from("messages")
    .select("id, posting_id, sender_id, body, created_at, postings(role_title), colleges(name), companies(name)")
    .neq("sender_id", profile.id)
    .gte("created_at", recentOpeningDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(40);

  const [postingsResult, campsResult, messagesResult] = await Promise.all([
    profile.role === "hr"
      ? postingQuery.eq("company_id", profile.company_id)
      : postingQuery,
    profile.role === "hr"
      ? campsQuery.eq("company_id", profile.company_id)
      : campsQuery.eq("college_id", profile.college_id),
    messagesQuery,
  ]);
  if (postingsResult.error || campsResult.error || messagesResult.error) {
    console.error(
      "Could not load notifications",
      postingsResult.error ?? campsResult.error ?? messagesResult.error,
    );
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  }
  const postings = postingsResult.data;
  const camps = campsResult.data;
  const messages = messagesResult.data;

  for (const posting of postings ?? []) {
    const company = Array.isArray(posting.companies) ? posting.companies[0] : posting.companies;
    notifications.push({
      id: `opening-${posting.id}`,
      type: "opening",
      title: "New job opening",
      message: `${posting.role_title} at ${company?.name ?? "a company"} is now available.`,
      href: profile.role === "hr" ? `/company/postings/${posting.id}` : "/college/dashboard",
      date: posting.created_at,
    });
  }

  for (const camp of camps ?? []) {
    const college = Array.isArray(camp.colleges) ? camp.colleges[0] : camp.colleges;
    const company = Array.isArray(camp.companies) ? camp.companies[0] : camp.companies;
    const eventName = camp.type === "camp" ? "Recruitment camp" : "Industry visit";
    const otherOrganization =
      profile.role === "hr" ? college?.name ?? "a college" : company?.name ?? "a company";

    notifications.push({
      id: `camp-${camp.id}`,
      type: "camp",
      title: `${eventName} scheduled`,
      message: `${eventName} with ${otherOrganization} is scheduled for ${camp.scheduled_date}.`,
      href: profile.role === "hr" ? `/company/postings/${camp.posting_id}` : "/college/camps",
      date: camp.scheduled_date,
    });

    notifications.push({
      id: `reminder-${camp.id}`,
      type: "reminder",
      title: "Upcoming event reminder",
      message: `Gentle reminder: your ${eventName.toLowerCase()} is coming up on ${camp.scheduled_date}.`,
      href: profile.role === "hr" ? `/company/postings/${camp.posting_id}` : "/college/camps",
      date: camp.scheduled_date,
    });
  }

  for (const message of messages ?? []) {
    const college = Array.isArray(message.colleges) ? message.colleges[0] : message.colleges;
    const company = Array.isArray(message.companies) ? message.companies[0] : message.companies;
    const senderName =
      profile.role === "hr" ? college?.name ?? "a college" : company?.name ?? "a company";
    const preview = message.body.length > 100 ? `${message.body.slice(0, 100)}…` : message.body;

    notifications.push({
      id: `message-${message.id}`,
      type: "message",
      title: `You have a message from ${senderName}`,
      message: preview,
      href: profile.role === "hr"
        ? `/company/postings/${message.posting_id}`
        : `/college/postings/${message.posting_id}`,
      date: message.created_at,
    });
  }

  notifications.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ notifications: notifications.slice(0, 40) });
}
