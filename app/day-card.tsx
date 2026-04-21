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

export default function DayCard({
  date,
  weekday,
  dayNum,
  isToday,
  isPast,
  events,
  headingLabel,
}: {
  date: string;
  weekday: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  events: EventRow[];
  headingLabel?: string;
}) {
  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        isToday
          ? "border-blue-300 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-500/5"
          : "border-gray-100 dark:border-white/8 bg-white dark:bg-[#0c1220]"
      } ${isPast && !isToday ? "opacity-70" : ""}`}
    >
      <div className="flex items-baseline gap-3 px-4 py-2 border-b border-gray-100 dark:border-white/8">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-[family-name:var(--font-ultra)] font-bold shrink-0 ${
            isToday ? "bg-blue-600 text-white" : "text-gray-900 dark:text-gray-200"
          }`}
        >
          {dayNum}
        </span>
        <span className={`text-sm font-medium ${isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
          {headingLabel || weekday}
        </span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {events.length === 0 ? "No events" : `${events.length} event${events.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {events.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-white/8">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/event/${encodeURIComponent(ev.id)}`}
              className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 w-16">{formatEventTime(ev.date, ev.time, ev.timezone)}</span>
              <div className="flex-1 min-w-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${FORMAT_BADGE[ev.format] || FORMAT_BADGE_DEFAULT}`}>
                  {ev.format}
                </span>
                <p className="text-base font-semibold text-gray-900 dark:text-white truncate mt-1">{ev.title}</p>
                {ev.location && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{ev.location}</p>
                )}
              </div>
              <span className={`text-sm font-[family-name:var(--font-ultra)] font-bold shrink-0 ${ev.cost === "Free" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                {ev.cost === "Free" ? "Free" : ev.cost || "\u2014"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

