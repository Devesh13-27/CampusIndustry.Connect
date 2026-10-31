"use client";

import { useState, useTransition } from "react";
import { deleteAdminPosting, deleteResume, deleteUser } from "./actions";

type DeleteKind = "user" | "posting" | "resume";

export default function AdminDeleteButton({
  kind,
  id,
  label,
}: {
  kind: DeleteKind;
  id: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "user"
          ? await deleteUser(id)
          : kind === "posting"
            ? await deleteAdminPosting(id)
            : await deleteResume(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-red-700">Delete {label}?</p>
        <div className="flex gap-2">
          <button type="button" disabled={isPending} onClick={() => setConfirming(false)} className="btn-secondary min-h-9 px-3 text-xs">
            Cancel
          </button>
          <button type="button" disabled={isPending} onClick={remove} className="min-h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {isPending ? "Deleting…" : "Confirm delete"}
          </button>
        </div>
        {error && <p role="alert" className="max-w-56 text-right text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setError(null);
        setConfirming(true);
      }}
      className="btn-secondary min-h-9 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      Delete
    </button>
  );
}
