"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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
const DROPDOWN_BASE = "absolute top-full mt-2 z-50 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-max";
const DROPDOWN_ALIGN = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" };
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
  align = "center",
}: {
  label: string;
  heading: string;
  options: { value: string; label: string; dot?: string }[];
  value: string;
  onChange: (v: string) => void;
  dot?: boolean;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 140);
  }, []);

  useClickOutside(ref, close);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => open ? close() : setOpen(true)} className={CHIP_TRIGGER}>
        {label}
      </button>
      {(open || closing) && (
        <div className={`${DROPDOWN_BASE} ${DROPDOWN_ALIGN[align]} ${closing ? "anim-scale-out" : "anim-scale-in"}`}>
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/8">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">{heading}</p>
          </div>
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); close(); }}
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
  const [subscribeToast, setSubscribeToast] = useState<{ top: number; left: number } | null>(null);

  function clampToast(rect: DOMRect) {
    const margin = 80;
    const center = rect.left + rect.width / 2;
    return { top: rect.bottom + 8, left: Math.max(margin, Math.min(window.innerWidth - margin, center)) };
  }

  function handleCityClick(e: React.MouseEvent) {
    setToastPos(clampToast((e.currentTarget as HTMLElement).getBoundingClientRect()));
    setTimeout(() => setToastPos(null), 2500);
  }

  function handleSubscribeClick(e: React.MouseEvent) {
    setSubscribeToast(clampToast((e.currentTarget as HTMLElement).getBoundingClientRect()));
    setTimeout(() => setSubscribeToast(null), 2500);
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
      {subscribeToast && (
        <div
          className="fixed z-50 px-3 py-2 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-lg text-sm text-gray-900 dark:text-white font-medium shadow-lg whitespace-nowrap pointer-events-none"
          style={{ top: `${subscribeToast.top}px`, left: `${subscribeToast.left}px`, transform: "translateX(-50%)" }}
        >
          {"\uD83D\uDCC5"} Subscribe coming soon!
        </div>
      )}
      <p className="text-gray-400 dark:text-gray-400 flex items-center justify-center flex-wrap gap-x-1.5 gap-y-1 text-sm sm:text-base leading-relaxed font-[family-name:var(--font-ultra)] font-bold">
        <span className="text-gray-900 dark:text-white font-[family-name:var(--font-ultra)]">{eventCount}</span>

        <ChipSelect
          label={currentFormat || "MTG"}
          heading="Format"
          options={formatOptions}
          value={currentFormat || ""}
          onChange={(v) => updateParam("format", v)}
          dot
          align="start"
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
          align="end"
        />

        <span className="text-gray-400 dark:text-gray-500">,</span>

        <button onClick={handleSubscribeClick} className={`${CHIP_TRIGGER} inline-flex items-center gap-1`}>
          subscribe
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </p>
    </>
  );
}
