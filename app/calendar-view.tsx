"use client";
import { useState } from "react";
import Link from "next/link";

interface EventRow {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  location: string;
  cost: string;
  store_url: string;
}

const FORMAT_DOT: Record<string, string> = {
  Commander: "bg-purple-500",
  Modern: "bg-blue-500",
  Standard: "bg-green-500",
  Pioneer: "bg-orange-500",
  Legacy: "bg-red-500",
  Pauper: "bg-yellow-500",
  Draft: "bg-cyan-500",
  Sealed: "bg-pink-500",
};

const FORMAT_BADGE: Record<string, string> = {
  Commander: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  Modern: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  Standard: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  Pioneer: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  Legacy: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  Pauper: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  Draft: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  Sealed: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
};

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  const days: { date: string; day: number; inMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d.toISOString().split("T")[0], day: d.getDate(), inMonth: false });
  }

  // Current month
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d.toISOString().split("T")[0], day: i, inMonth: true });
  }

  // Next month padding (fill to complete last week)
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - startPad - totalDays + 1);
    days.push({ date: d.toISOString().split("T")[0], day: d.getDate(), inMonth: false });
  }

  return days;
}

export default function CalendarView({ events }: { events: EventRow[] }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = today.toISOString().split("T")[0];

  // Group events by date
  const byDate: Record<string, EventRow[]> = {};
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  }

  const days = getMonthDays(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDate(null);
  }

  function goToday() {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setSelectedDate(todayStr);
  }

  const selectedEvents = selectedDate ? (byDate[selectedDate] || []) : [];

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white tracking-tight">{monthName}</h2>
          <button onClick={goToday} className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer">Today</button>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-2 font-medium">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border border-gray-100 dark:border-white/8 rounded-xl overflow-hidden">
        {days.map((day, i) => {
          const dayEvents = byDate[day.date] || [];
          const isToday = day.date === todayStr;
          const isSelected = day.date === selectedDate;
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : day.date)}
              className={`relative min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-gray-100 dark:border-white/8 text-left transition-colors cursor-pointer
                ${!day.inMonth ? "bg-gray-50/50 dark:bg-white/[0.02]" : "bg-white dark:bg-[#0c1220]"}
                ${isSelected ? "!bg-blue-50 dark:!bg-blue-500/10 ring-2 ring-blue-500 ring-inset z-10" : ""}
                ${hasEvents && !isSelected ? "hover:bg-gray-50 dark:hover:bg-white/5" : ""}
              `}
            >
              {/* Day number */}
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-[family-name:var(--font-ultra)]
                ${isToday ? "bg-blue-600 text-white" : ""}
                ${!isToday && day.inMonth ? "text-gray-900 dark:text-gray-200" : ""}
                ${!day.inMonth ? "text-gray-300 dark:text-gray-600" : ""}
              `}>
                {day.day}
              </span>

              {/* Event dots / pills */}
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev, j) => (
                  <div key={j} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${FORMAT_DOT[ev.format] || "bg-gray-400"}`} />
                    <span className="text-[10px] leading-tight text-gray-600 dark:text-gray-400 truncate hidden md:block">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDate && (
        <div className="mt-4 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8">
            <h3 className="text-sm font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</p>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">No events on this day</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/8">
              {selectedEvents.map((ev) => (
                <Link key={ev.id} href={`/event/${encodeURIComponent(ev.id)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${FORMAT_BADGE[ev.format] || "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300"}`}>
                    {ev.format}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatTime(ev.time)} UTC · {ev.location}</p>
                  </div>
                  <span className={`text-sm font-[family-name:var(--font-ultra)] font-bold shrink-0 ${ev.cost === "Free" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                    {ev.cost === "Free" ? "Free" : ev.cost || "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
