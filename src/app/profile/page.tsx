import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import Nav from "@/components/Nav";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div>
      <Nav orgName={profile.full_name} links={[{ href: "/profile", label: "My profile" }]} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Account</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Your profile</h1>
          <p className="mt-1 text-sm text-slate-500">Keep your contact details current so the right people can reach you.</p>
        </div>
        <div className="card p-5 sm:p-8">
          <ProfileForm profile={profile} />
        </div>
      </main>
    </div>
  );
}
