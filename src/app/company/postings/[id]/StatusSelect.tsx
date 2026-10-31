"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePosting, updatePostingStatus } from "@/app/company/actions";
import type { PostingStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/statusStyles";

export default function StatusSelect({
  postingId,
  status,
}: {
  postingId: string;
  status: PostingStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  function updateStatus(next: PostingStatus) {

    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await updatePostingStatus(postingId, next);

        if (!result.success) {
          if (selectRef.current) {
            selectRef.current.value = status;
          }

          setFeedback("error");
          return;
        }

        setFeedback("saved");
      } catch {
        if (selectRef.current) {
          selectRef.current.value = status;
        }

        setFeedback("error");
      }
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateStatus(e.target.value as PostingStatus);
  }

  function handleDelete() {
    if (!window.confirm("Delete this job opening permanently? Its messages, interest reports, and scheduled activities will also be deleted.")) {
      return;
    }

    setDeleteError(false);
    startTransition(async () => {
      const result = await deletePosting(postingId);
      if (!result.success) {
        setDeleteError(true);
        return;
      }
      router.push("/company/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:items-end">
      <select
        key={status}
        ref={selectRef}
        defaultValue={status}
        onChange={handleChange}
        disabled={isPending}
        aria-label="Posting status"
        aria-busy={isPending}
        className="input-field w-auto shrink-0 py-1.5 font-medium"
      >
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div
        role="status"
        aria-live="polite"
        className={`text-xs ${
          feedback === "saved"
            ? "text-green-600"
            : feedback === "error"
              ? "text-red-600"
              : "text-transparent"
        }`}
      >
        {feedback === "saved"
          ? "✓ Status updated"
          : feedback === "error"
            ? "Couldn't update status. Please try again."
            : " "}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
            {status !== "closed" && (
              <button
                type="button"
                onClick={() => updateStatus("closed")}
                disabled={isPending}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Close opening
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete permanently
            </button>
      </div>
      {deleteError && (
            <p role="alert" className="text-xs text-red-600">
              Couldn&apos;t delete the posting. Please try again.
            </p>
      )}
    </div>
  );
}