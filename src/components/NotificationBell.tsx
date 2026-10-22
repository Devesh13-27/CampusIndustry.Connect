"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NotificationItem } from "@/lib/notifications";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem("campus-connect-read-notifications");
    if (!stored) return [];
    try {
      return JSON.parse(stored) as string[];
    } catch {
      window.localStorage.removeItem("campus-connect-read-notifications");
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;
    const data = (await response.json()) as { notifications?: NotificationItem[] };
    setNotifications(data.notifications ?? []);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  function markAllRead() {
    const ids = notifications.map((item) => item.id);
    setReadIds(ids);
    window.localStorage.setItem("campus-connect-read-notifications", JSON.stringify(ids));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) markAllRead();
        }}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            <button type="button" onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-800">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!notifications.length && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                You&apos;re all caught up.
              </p>
            )}
            {notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.message}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
