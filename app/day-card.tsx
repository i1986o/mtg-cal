"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { FORMAT_BADGE, FORMAT_BADGE_DEFAULT } from "@/lib/format-style";
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
  staggerBase = 0,
}: {
  date: string;
  weekday: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  events: EventRow[];
  headingLabel?: string;
  staggerBase?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrapper.style.opacity = "1";
      wrapper.querySelectorAll<HTMLElement>("[data-row]").forEach((r) => (r.style.opacity = "1"));
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        // Card shell
        timers.push(
          setTimeout(() => {
            wrapper.style.removeProperty("opacity");
            wrapper.classList.add("anim-fade-in-up");
          }, staggerBase)
        );

        // Each event row staggers in after the card
        wrapper.querySelectorAll<HTMLElement>("[data-row]").forEach((row, i) => {
          timers.push(
            setTimeout(() => {
              row.style.removeProperty("opacity");
              row.classList.add("anim-row-in");
            }, staggerBase + 80 + i * 45)
          );
        });

        observer.unobserve(wrapper);
      },
      { threshold: 0.04, rootMargin: "0px 0px -12px 0px" }
    );

    observer.observe(wrapper);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [staggerBase]);

  return (
    <div ref={wrapperRef} style={{ opacity: 0 }}>
      <div
        className={`rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:shadow-black/30 ${
          isToday
            ? "border-blue-300 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-500/5 hover:border-blue-400 dark:hover:border-blue-400/60"
            : "border-gray-100 dark:border-white/8 bg-white dark:bg-[#0c1220] hover:border-gray-200 dark:hover:border-white/15"
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
                data-row
                style={{ opacity: 0 }}
                className="group flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200"
              >
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 w-16 transition-colors duration-200 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                  {formatEventTime(ev.date, ev.time, ev.timezone)}
                </span>
                <div className="flex-1 min-w-0 transition-transform duration-200 group-hover:translate-x-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${FORMAT_BADGE[ev.format] || FORMAT_BADGE_DEFAULT}`}>
                    {ev.format}
                  </span>
                  <p className="text-base font-semibold text-gray-900 dark:text-white truncate mt-1">{ev.title}</p>
                  {ev.location && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{ev.location}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-sm font-[family-name:var(--font-ultra)] font-bold transition-transform duration-200 group-hover:translate-x-0.5 ${ev.cost === "Free" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                    {ev.cost === "Free" ? "Free" : ev.cost || "\u2014"}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-gray-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
