"use client";

import { useState, useTransition } from "react";
import { cancelCamp, sendMessageAsHr, proposeCamp } from "@/app/company/actions";
import { CAMP_STATUS_LABEL } from "@/lib/statusStyles";
import { useRealtimeMessages } from "@/lib/use-realtime-messages";
import type { Message, CampVisit } from "@/lib/types";

export default function ThreadPanel({
  postingId,
  companyId,
  collegeId,
  collegeName,
  initialMessages,
  camp,
}: {
  postingId: string;
  companyId: string;
  collegeId: string;
  collegeName: string;
  initialMessages: Message[];
  camp: CampVisit | null;
}) {
  const {
    messages,
    setMessages,
    realtimeError,
    messagesContainerRef,
  } = useRealtimeMessages(postingId, collegeId, initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showCampForm, setShowCampForm] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [campError, setCampError] = useState<string | null>(null);
  const [messageSaved, setMessageSaved] = useState(false);
  const [campSaved, setCampSaved] = useState(false);

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const body = text.trim();
    if (!body || isPending) return;

    setMessageError(null);
    setMessageSaved(false);
    setText("");

    startTransition(async () => {
      try {
        const result = await sendMessageAsHr(
          postingId,
          companyId,
          collegeId,
          body,
        );

        if (!result.success) {
          setMessageError(result.error);
          setText(body);
          return;
        }

        setMessages((prev) =>
          prev.some((message) => message.id === result.message.id)
            ? prev
            : [...prev, result.message],
        );

        setMessageSaved(true);
      } catch {
        setMessageError("Unable to send the message. Please try again.");
        setText(body);
      }
    });
  }

  function handleProposeCamp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get("type") as "camp" | "visit";
    const date = formData.get("date") as string;

    setCampError(null);
    setCampSaved(false);

    if (!date) {
      setCampError("Please select a date.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await proposeCamp(
          postingId,
          companyId,
          collegeId,
          type,
          date,
        );

        if (!result.success) {
          setCampError(result.error);
          return;
        }

        setShowCampForm(false);
        setCampSaved(true);
      } catch {
        setCampError(
          "Unable to propose the camp or visit. Please try again.",
        );
      }
    });
  }

  function handleCancelCamp() {
    if (!camp || !window.confirm("Cancel this camp or visit?")) return;
    setCampError(null);
    startTransition(async () => {
      const result = await cancelCamp(camp.id, postingId);
      if (!result.success) {
        setCampError(result.error);
        return;
      }
      setCampSaved(true);
    });
  }

  return (
    <div className="card flex h-full min-h-[500px] max-h-[600px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-3">
        <h3 className="min-w-0 truncate font-medium text-slate-900">
          {collegeName}
        </h3>

        <button
          type="button"
          onClick={() => {
            setShowCampForm((v) => !v);
            setCampError(null);
            setCampSaved(false);
          }}
          disabled={isPending}
          className="btn-ghost shrink-0 text-xs"
        >
          {showCampForm ? "Cancel" : "Propose camp / visit"}
        </button>
      </div>

      {camp && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span>
            {camp.type === "camp" ? "Recruitment camp" : "Industry visit"} on{" "}
            {camp.scheduled_date} — {CAMP_STATUS_LABEL[camp.status]}
          </span>
          {["proposed", "confirmed"].includes(camp.status) && (
            <button
              type="button"
              onClick={handleCancelCamp}
              disabled={isPending}
              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {campSaved && (
        <p
          role="status"
          aria-live="polite"
          className="border-b border-slate-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          ✓ Proposal sent successfully.
        </p>
      )}

      {showCampForm && (
        <form
          onSubmit={handleProposeCamp}
          className="flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm sm:flex-initial">
            <span className="sr-only">Proposal type</span>
            <select
              name="type"
              disabled={isPending}
              className="input-field py-1.5"
            >
              <option value="camp">Recruitment camp</option>
              <option value="visit">Industry visit</option>
            </select>
          </label>

          <label className="flex-1 text-sm sm:flex-initial">
            <span className="sr-only">Proposal date</span>
            <input
              name="date"
              type="date"
              required
              disabled={isPending}
              className="input-field py-1.5"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary min-h-10 py-1.5"
          >
            {isPending ? "Sending…" : "Propose"}
          </button>
        </form>
      )}

      {campError && (
        <p
          role="alert"
          aria-live="assertive"
          className="border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {campError}
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

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-smooth p-4"
      >
        {!messages.length && (
          <p className="text-sm text-slate-400">
            No messages yet — say hello.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              m.sender_role === "hr"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            {m.body}
          </div>
        ))}
      </div>

      {messageSaved && (
        <p
          role="status"
          aria-live="polite"
          className="border-t border-slate-200 bg-green-50 px-3 py-2 text-center text-xs font-medium text-green-700"
        >
          ✓ Message sent
        </p>
      )}

      {messageError && (
        <p
          role="alert"
          aria-live="assertive"
          className="border-t border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {messageError}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <label className="sr-only" htmlFor="message">
          Message the T&P officer
        </label>

        <input
          id="message"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMessageError(null);
            setMessageSaved(false);
          }}
          placeholder="Message the T&P officer…"
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