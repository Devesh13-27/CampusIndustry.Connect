"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

type RealtimeMessageRecord = Omit<Message, "id"> & { id: string };

export function useRealtimeMessages(
  postingId: string,
  collegeId: string,
  initialMessages: Message[],
) {
  const [messages, setMessages] = useState(initialMessages);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const shouldFollowLatest = distanceFromBottom < 120;

    if (shouldFollowLatest) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: initialMessages.length ? "smooth" : "auto",
      });
    }
  }, [messages.length, initialMessages.length]);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;

    async function loadMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("posting_id", postingId)
        .eq("college_id", collegeId)
        .order("created_at", { ascending: true });

      if (disposed) return;

      if (error) {
        setRealtimeError(
          "Live message updates are unavailable. Refresh to check for new messages.",
        );
        return;
      }

      setRealtimeError(null);
      setMessages(data as Message[]);
    }

    const channel = supabase
      .channel(`messages:${postingId}:${collegeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `posting_id=eq.${postingId}`,
        },
        (payload) => {
          const message = payload.new as RealtimeMessageRecord;
          if (message.college_id !== collegeId) return;

          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) return current;
            return [...current, message].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeError(null);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeError(
            "Live message updates are unavailable. Refresh to check for new messages.",
          );
        }
      });

    void loadMessages();
    const pollingId = window.setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => {
      disposed = true;
      window.clearInterval(pollingId);
      void supabase.removeChannel(channel);
    };
  }, [postingId, collegeId]);

  return {
    messages,
    setMessages,
    realtimeError,
    messagesContainerRef,
  };
}
