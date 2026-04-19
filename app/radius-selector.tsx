"use client";
import { useState } from "react";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];
const TIME_OPTIONS = [
  { value: "7", label: "week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "month" },
  { value: "60", label: "2 months" },
  { value: "90", label: "3 months" },
];

const FORMAT_EMOJI: Record<string, string> = {
  Commander: "\u2694\uFE0F",
  Modern: "\u26A1",
  Standard: "\u2B50",
  Pioneer: "\uD83E\uDE90",
  Legacy: "\uD83D\uDC51",
  Pauper: "\uD83E\uDE99",
  Draft: "\uD83C\uDFB2",
  Sealed: "\uD83C\uDF81",
};

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
  const formatLabel = currentFormat || "MTG";

  function handleCityClick(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setToastPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    setTimeout(() => setToastPos(null), 2500);
  }

  return (
    <>
      {toastPos && (
        <div
          className="fixed z-50 px-3 py-2 bg-white dark:bg-[#0e2240] border border-gray-200 dark:border-[#1a3558] rounded-lg text-sm text-gray-900 dark:text-white font-medium shadow-lg whitespace-nowrap pointer-events-none"
          style={{ top: `${toastPos.top}px`, left: `${toastPos.left}px`, transform: "translateX(-50%)" }}
        >
          {"\uD83D\uDDFA\uFE0F"} More cities coming soon!
        </div>
      )}
    <p className="text-gray-400 dark:text-gray-400 flex items-center justify-center gap-1.5 flex-wrap text-xl leading-relaxed font-[family-name:var(--font-ultra)] font-bold">
      <span className="text-gray-900 dark:text-white font-[family-name:var(--font-ultra)]">{eventCount}</span>

      {/* Format selector */}
      <select
        value={currentFormat || ""}
        onChange={(e) => updateParam("format", e.target.value)}
        className="inline-block bg-transparent border-b-2 border-orange-400 dark:border-orange-500/50 text-orange-600 dark:text-orange-300 font-[family-name:var(--font-ultra)] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 cursor-pointer appearance-none text-center px-1 hover:border-orange-500 dark:hover:border-orange-400 transition-colors w-[8ch]"
      >
        <option value="">MTG</option>
        {formats.map((f) => (
          <option key={f} value={f}>{FORMAT_EMOJI[f] || ""} {f}</option>
        ))}
      </select>

      <span>events within</span>

      {/* Radius selector */}
      <select
        value={currentRadius}
        onChange={(e) => updateParam("radius", e.target.value)}
        className="inline-block bg-transparent border-b-2 border-purple-400 dark:border-purple-500/50 text-purple-600 dark:text-purple-300 font-[family-name:var(--font-ultra)] focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 cursor-pointer appearance-none text-center px-1 hover:border-purple-500 dark:hover:border-purple-400 transition-colors w-[3ch]"
      >
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <span>miles of</span>

      {/* City selector — coming soon */}
      <button
        onClick={handleCityClick}
        className="inline-block bg-transparent border-b-2 border-emerald-400 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-300 font-[family-name:var(--font-ultra)] cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors px-1"
      >
        Philly
      </button>

      <span>in the next</span>

      {/* Time selector */}
      <select
        value={currentDays}
        onChange={(e) => updateParam("days", e.target.value)}
        className="inline-block bg-transparent border-b-2 border-pink-400 dark:border-pink-500/50 text-pink-600 dark:text-pink-300 font-[family-name:var(--font-ultra)] focus:outline-none focus:border-pink-500 dark:focus:border-pink-400 cursor-pointer appearance-none text-center px-1 hover:border-pink-500 dark:hover:border-pink-400 transition-colors w-[10ch]"
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </p>
    </>
  );
}
