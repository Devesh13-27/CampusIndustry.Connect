"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const supabase = createClient();
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [postingId, collegeId]);

  return { messages, setMessages, realtimeError };
}
