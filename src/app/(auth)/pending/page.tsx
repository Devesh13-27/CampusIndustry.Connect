import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import FullLogo from "@/components/FullLogo";
import AuthBackdrop from "@/components/AuthBackdrop";

export default async function PendingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.verification_status === "verified") {
    redirect(profile.role === "hr" ? "/company/dashboard" : "/college/dashboard");
  }

  const supabase = await createClient();
  const orgTable = profile.role === "hr" ? "companies" : "colleges";
  const orgId = profile.role === "hr" ? profile.company_id : profile.college_id;
  const { data: org } = await supabase
    .from(orgTable)
    .select("name, verification_status")
    .eq("id", orgId)
    .single();

  const rejected =
    profile.verification_status === "rejected" || org?.verification_status === "rejected";

  return (
    <div className="auth-page relative flex flex-col">
      <AuthBackdrop />
      <FullLogo className="auth-logo mb-1" size="" />
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            rejected ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          <span className="text-xl">{rejected ? "✕" : "⏳"}</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          {rejected ? "Verification not approved" : "Awaiting verification"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {rejected
            ? "Your account or organization could not be verified. Contact support if you think this is a mistake."
            : `We're confirming your account and ${org?.name ?? "your organization"} before giving access. This is usually quick — check back soon.`}
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
