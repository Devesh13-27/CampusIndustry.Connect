"use client";

import { useState, useTransition } from "react";
import { cancelCamp, confirmCamp } from "@/app/college/actions";

export default function ConfirmButton({
  campId,
  status,
}: {
  campId: string;
  status: "proposed" | "confirmed";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await confirmCamp(campId);
      if (!result.success) setError(result.error);
    });
  }

  function handleCancel() {
    if (!window.confirm("Cancel this camp or visit?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelCamp(campId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "proposed" && (
        <button
          onClick={handleClick}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Confirming…" : "Confirm"}
        </button>
      )}
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Cancel
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
