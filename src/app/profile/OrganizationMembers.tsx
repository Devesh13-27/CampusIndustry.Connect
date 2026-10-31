"use client";

import { useState, useTransition } from "react";
import type { Member } from "./actions";
import { addOrganizationMember, removeOrganizationMember } from "./actions";

export default function OrganizationMembers({
  members,
  canManage,
}: {
  members: Member[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await addOrganizationMember(new FormData(form));
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
      setSaved(true);
    });
  }

  function remove(member: Member) {
    if (!window.confirm(`Remove ${member.full_name} from this organization?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeOrganizationMember(member.id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-slate-900">Organization members</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {canManage
          ? "Add up to 2 assistants who can work with this organization."
          : "You are an assistant member. The primary account manages organization members."}
      </p>

      <div className="mt-3 space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{member.full_name}</p>
              <p className="truncate text-xs text-slate-500">{member.email}</p>
            </div>
            {canManage && (
              <button type="button" disabled={isPending} onClick={() => remove(member)} className="btn-secondary ml-3 min-h-9 px-3 text-xs text-red-600">
                Remove
              </button>
            )}
          </div>
        ))}
        {!members.length && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">No assistant members yet.</p>}
      </div>

      {canManage && members.length < 2 && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2">
          <input name="full_name" required placeholder="Assistant name" className="input-field" />
          <input name="email" type="email" required placeholder="Assistant email" className="input-field" />
          <input name="password" type="password" required minLength={8} placeholder="Temporary password" className="input-field" />
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Adding member…" : "Add member"}
          </button>
          <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Share the temporary password securely. The assistant can change it later using password recovery.</p>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="mt-2 text-sm text-green-700">Member added.</p>}
    </section>
  );
}
