"use client";
import { useState } from "react";
import Link from "next/link";
import { FORMAT_DOT, FORMAT_BADGE, FORMAT_BADGE_DEFAULT } from "@/lib/format-style";
import { formatEventTime } from "@/lib/format-time";

interface EventRow {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  cost: string;
  store_url: string;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({ events }: { events: EventRow[] }) {
  const today = new Date();
  const todayStr = isoDate(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const byDate: Record<string, EventRow[]> = {};
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: isoDate(d), dayNum: d.getDate(), weekday: WEEKDAYS[d.getDay()] };
  });

  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekLabel = sameMonth
    ? `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition cursor-pointer"
          aria-label="Previous week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white tracking-wider">{weekLabel}</h2>
          <button
            onClick={() => setWeekStart(startOfWeek(today))}
            className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer"
          >
            This week
          </button>
        </div>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition cursor-pointer"
          aria-label="Next week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-white/10 border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
        {weekDays.map((day) => {
          const isToday = day.date === todayStr;
          const isPast = day.date < todayStr;
          const dayEvents = byDate[day.date] || [];

          return (
            <div
              key={day.date}
              className={`flex flex-col min-h-[320px] ${
                isToday ? "bg-blue-50/40 dark:bg-blue-500/5" : "bg-white dark:bg-[#0c1220]"
              } ${isPast && !isToday ? "opacity-70" : ""}`}
            >
              <div className={`flex flex-col items-center py-2 border-b border-gray-100 dark:border-white/8 ${isToday ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-400 dark:text-gray-500"}`}>
                  {day.weekday}
                </span>
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-[family-name:var(--font-ultra)] font-bold mt-0.5 ${
                  isToday ? "bg-blue-600 text-white" : "text-gray-900 dark:text-gray-200"
                }`}>
                  {day.dayNum}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1 p-1.5">
                {dayEvents.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-700">—</div>
                ) : (
                  dayEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/event/${encodeURIComponent(ev.id)}`}
                      title={`${ev.title}${ev.location ? ` · ${ev.location}` : ""}${ev.cost ? ` · ${ev.cost}` : ""} · ${formatEventTime(ev.date, ev.time, ev.timezone)}`}
                      className="group block rounded p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${FORMAT_DOT[ev.format] || "bg-gray-400"}`} />
                        <span className={`px-1 py-0 rounded text-[9px] font-medium shrink-0 ${FORMAT_BADGE[ev.format] || FORMAT_BADGE_DEFAULT}`}>
                          {ev.format}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatEventTime(ev.date, ev.time, ev.timezone)}</div>
                      <div className="text-[11px] font-medium text-gray-900 dark:text-white leading-tight line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-100">
                        {ev.title}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
