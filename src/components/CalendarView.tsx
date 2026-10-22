"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  href: string;
  status: string;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const previousLastDate = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
    return Array.from({ length: Math.ceil((firstDay + lastDate) / 7) * 7 }, (_, index) => {
      const dayNumber = index - firstDay + 1;
      if (dayNumber < 1) {
        return new Date(month.getFullYear(), month.getMonth() - 1, previousLastDate + dayNumber);
      }
      if (dayNumber > lastDate) {
        return new Date(month.getFullYear(), month.getMonth() + 1, dayNumber - lastDate);
      }
      return new Date(month.getFullYear(), month.getMonth(), dayNumber);
    });
  }, [month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    }
    return map;
  }, [events]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn-ghost">
          ←
        </button>
        <h2 className="text-lg font-semibold text-slate-900">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn-ghost">
          →
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDate.get(key) ?? [];
          const inMonth = day.getMonth() === month.getMonth();
          return (
            <div key={key} className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${inMonth ? "bg-white" : "bg-slate-50/70"}`}>
              <p className={`mb-1 text-xs font-medium ${inMonth ? "text-slate-700" : "text-slate-400"}`}>{day.getDate()}</p>
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <Link key={event.id} href={event.href} className="block rounded-md bg-blue-50 px-1.5 py-1 text-[10px] leading-4 text-blue-800 hover:bg-blue-100">
                    <span className="font-semibold">{event.title}</span>
                    <span className="hidden sm:block">{event.subtitle}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
