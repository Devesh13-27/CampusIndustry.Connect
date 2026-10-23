"use client";

import { useState, useTransition } from "react";
import { sendMessageAsTp, confirmCamp } from "@/app/college/actions";
import { CAMP_STATUS_LABEL } from "@/lib/statusStyles";
import { formatDate } from "@/lib/utils";
import type { Message, CampVisit } from "@/lib/types";
import { useRealtimeMessages } from "@/lib/use-realtime-messages";

export default function TpThreadPanel({
  postingId,
  collegeId,
  companyId,
  initialMessages,
  camp,
}: {
  postingId: string;
  collegeId: string;
  companyId: string;
  initialMessages: Message[];
  camp: CampVisit | null;
}) {
  const { messages, setMessages, realtimeError } = useRealtimeMessages(
    postingId,
    collegeId,
    initialMessages,
  );
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSaved, setConfirmSaved] = useState(false);

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const body = text.trim();
    if (!body || isPending) return;

    setSendError(null);
    setText("");

    const optimistic: Message = {
      id: crypto.randomUUID(),
      posting_id: postingId,
      college_id: "",
      company_id: companyId,
      sender_id: "me",
      sender_role: "tp",
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      try {
        const result = await sendMessageAsTp(postingId, companyId, body);

        if (!result.success) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimistic.id),
          );
          setText(body);
          setSendError(result.error);
          return;
        }

        setMessages((prev) => {
          if (prev.some((message) => message.id === result.message.id)) {
            return prev.filter((message) => message.id !== optimistic.id);
          }

          const hasOptimisticMessage = prev.some(
            (message) => message.id === optimistic.id,
          );

          return hasOptimisticMessage
            ? prev.map((message) =>
                message.id === optimistic.id ? result.message : message,
              )
            : [...prev, result.message];
        });
      } catch {
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimistic.id),
        );
        setText(body);
        setSendError("Unable to send the message. Please try again.");
      }
    });
  }

  function handleConfirm() {
    if (!camp || camp.status !== "proposed" || isPending) return;

    setConfirmError(null);
    setConfirmSaved(false);

    startTransition(async () => {
      try {
        const result = await confirmCamp(camp.id);

        if (!result.success) {
          setConfirmError(result.error);
          return;
        }

        setConfirmSaved(true);
      } catch {
        setConfirmError(
          "Unable to confirm this proposal. Please try again.",
        );
      }
    });
  }

  return (
    <div
      className="card flex h-full min-h-[500px] max-h-[600px] flex-col overflow-hidden"
      aria-busy={isPending}
    >
      <div className="border-b border-slate-200 bg-slate-50/50 p-3">
        <h3 className="font-medium text-slate-900">Message HR</h3>
      </div>

      {camp && (
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {camp.type === "camp" ? "Recruitment camp" : "Industry visit"}{" "}
            proposed for {formatDate(camp.scheduled_date)} —{" "}
            {CAMP_STATUS_LABEL[camp.status]}
          </span>

          {camp.status === "proposed" && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              {isPending ? "Confirming…" : "Confirm"}
            </button>
          )}
        </div>
      )}

      {confirmSaved && (
        <p
          role="status"
          aria-live="polite"
          className="border-b border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          ✓ Recruitment proposal confirmed successfully.
        </p>
      )}

      {confirmError && (
        <p
          role="alert"
          aria-live="assertive"
          className="border-b border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {confirmError}
        </p>
      )}

      {realtimeError && (
        <p
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {realtimeError}
        </p>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!messages.length && (
          <p className="text-sm text-slate-400">
            No messages yet — say hello.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              m.sender_role === "tp"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            {m.body}
          </div>
        ))}
      </div>

      {sendError && (
        <p
          role="alert"
          aria-live="assertive"
          className="border-t border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {sendError}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <label htmlFor="tp-message" className="sr-only">
          Message the HR contact
        </label>

        <input
          id="tp-message"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSendError(null);
          }}
          placeholder="Message the HR contact…"
          disabled={isPending}
          className="input-field min-w-0 flex-1"
        />

        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="btn-primary shrink-0"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}