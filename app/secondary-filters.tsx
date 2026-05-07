"use client";

// Secondary filter pills below the main madlib filter row. Time-of-day
// (morning / afternoon / evening) and a free-only toggle. Pills toggle
// URL params and full-page reload — same pattern the radius/format
// dropdowns already use, so we don't introduce a separate state model.

import { useCallback } from "react";

type TimeOfDay = "morning" | "afternoon" | "evening";

const TIME_OPTIONS: { value: TimeOfDay; label: string; emoji: string }[] = [
  { value: "morning", label: "Morning", emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", emoji: "☀️" },
  { value: "evening", label: "Evening", emoji: "🌙" },
];

interface Props {
  currentTimeOfDay: TimeOfDay | undefined;
  currentFreeOnly: boolean;
}

export default function SecondaryFilters({ currentTimeOfDay, currentFreeOnly }: Props) {
  // Helper that mirrors the URL-param-then-reload pattern in
  // radius-selector.tsx. Pass undefined to unset.
  const updateParam = useCallback((key: string, value: string | undefined) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.location.href = url.toString();
  }, []);

  const pillClass = (active: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer focus:outline-none ${
      active
        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
        : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"
    }`;

  // Anything active? Show a "clear" affordance to make undoing obvious.
  const anyActive = currentTimeOfDay != null || currentFreeOnly;

  return (
    <div className="mt-2 flex items-center justify-center flex-wrap gap-1.5">
      {TIME_OPTIONS.map((opt) => {
        const active = currentTimeOfDay === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateParam("time", active ? undefined : opt.value)}
            className={pillClass(active)}
            title={`Show only ${opt.label.toLowerCase()} events`}
          >
            <span aria-hidden="true">{opt.emoji}</span>
            {opt.label}
          </button>
        );
      })}

      {/* Visual separator between time-of-day cluster and the free toggle */}
      <span className="text-neutral-300 dark:text-neutral-700 mx-1 select-none">·</span>

      <button
        type="button"
        onClick={() => updateParam("free", currentFreeOnly ? undefined : "1")}
        className={pillClass(currentFreeOnly)}
        title="Show only free events"
      >
        <span aria-hidden="true">🆓</span>
        Free only
      </button>

      {anyActive && (
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete("time");
            url.searchParams.delete("free");
            window.location.href = url.toString();
          }}
          className="ml-1 text-[10px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline decoration-dotted underline-offset-2 transition cursor-pointer"
          title="Clear secondary filters"
        >
          clear
        </button>
      )}
    </div>
  );
}
