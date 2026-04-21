"use client";
import { useState, useRef, useEffect } from "react";
import { FORMAT_DOT } from "@/lib/format-style";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];
function getTimeOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [
    { value: "7", label: "This week" },
  ];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const daysUntilEnd = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd < 3) continue;
    const label = i === 0 ? "This month" : d.toLocaleDateString("en-US", { month: "long" });
    options.push({ value: String(daysUntilEnd), label });
  }

  return options;
}

const TIME_OPTIONS = getTimeOptions();

const CHIP_TRIGGER = "inline-block underline decoration-dotted underline-offset-4 decoration-gray-400 dark:decoration-gray-500 text-gray-900 dark:text-white font-[family-name:var(--font-ultra)] focus:outline-none cursor-pointer bg-transparent hover:decoration-solid hover:decoration-gray-700 dark:hover:decoration-gray-300 transition-all px-1";
const DROPDOWN = "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-max";
const OPTION = "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function ChipSelect({
  label,
  heading,
  options,
  value,
  onChange,
  dot,
}: {
  label: string;
  heading: string;
  options: { value: string; label: string; dot?: string }[];
  value: string;
  onChange: (v: string) => void;
  dot?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className={CHIP_TRIGGER}>
        {label}
      </button>
      {open && (
        <div className={DROPDOWN}>
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/8">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">{heading}</p>
          </div>
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`${OPTION} ${selected ? "bg-gray-50 dark:bg-white/8 text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-gray-400 font-medium"}`}
              >
                {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot || "bg-gray-400 dark:bg-gray-600"}`} />}
                <span className="flex-1">{opt.label}</span>
                {selected && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RadiusSelector({
  currentRadius,
  currentDays,
  currentFormat,
  formats,
  eventCount,
}: {
  currentRadius: number;
  currentDays: number;
  currentFormat?: string;
  formats: string[];
  eventCount: number;
}) {
  function updateParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.location.href = url.toString();
  }

  const [toastPos, setToastPos] = useState<{ top: number; left: number } | null>(null);

  function handleCityClick(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setToastPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    setTimeout(() => setToastPos(null), 2500);
  }

  const formatOptions = [
    { value: "", label: "All formats", dot: "bg-gray-400 dark:bg-gray-600" },
    ...formats.map((f) => ({ value: f, label: f, dot: FORMAT_DOT[f] || "bg-gray-400" })),
  ];

  const radiusOptions = RADIUS_OPTIONS.map((r) => ({ value: String(r), label: `${r} miles` }));

  return (
    <>
      {toastPos && (
        <div
          className="fixed z-50 px-3 py-2 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-lg text-sm text-gray-900 dark:text-white font-medium shadow-lg whitespace-nowrap pointer-events-none"
          style={{ top: `${toastPos.top}px`, left: `${toastPos.left}px`, transform: "translateX(-50%)" }}
        >
          {"\uD83D\uDDFA\uFE0F"} More cities coming soon!
        </div>
      )}
      <p className="text-gray-400 dark:text-gray-400 flex items-center justify-center gap-1.5 text-base leading-relaxed font-[family-name:var(--font-ultra)] font-bold whitespace-nowrap">
        <span className="text-gray-900 dark:text-white font-[family-name:var(--font-ultra)]">{eventCount}</span>

        <ChipSelect
          label={currentFormat || "MTG"}
          heading="Format"
          options={formatOptions}
          value={currentFormat || ""}
          onChange={(v) => updateParam("format", v)}
          dot
        />

        <span>events within</span>

        <ChipSelect
          label={`${currentRadius}`}
          heading="Range"
          options={radiusOptions}
          value={String(currentRadius)}
          onChange={(v) => updateParam("radius", v)}
        />

        <span>miles of</span>

        <button onClick={handleCityClick} className={CHIP_TRIGGER}>
          Philly
        </button>

        <span>in</span>

        <ChipSelect
          label={TIME_OPTIONS.find((t) => t.value === String(currentDays))?.label || "This week"}
          heading="Timeframe"
          options={TIME_OPTIONS}
          value={String(currentDays)}
          onChange={(v) => updateParam("days", v)}
        />
      </p>
    </>
  );
}
