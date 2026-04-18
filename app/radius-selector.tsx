"use client";

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

  const timeLabel = TIME_OPTIONS.find(t => t.value === String(currentDays))?.label || `${currentDays} days`;
  const formatLabel = currentFormat || "MTG";

  return (
    <p className="text-gray-400 flex items-center justify-center gap-1 flex-wrap text-lg leading-relaxed">
      <span className="text-white font-bold text-2xl">{eventCount}</span>

      {/* Format selector */}
      <select
        value={currentFormat || ""}
        onChange={(e) => updateParam("format", e.target.value)}
        className="inline-block bg-transparent border-b-2 border-orange-500/50 text-orange-300 font-semibold focus:outline-none focus:border-orange-400 cursor-pointer appearance-none text-center px-1 hover:border-orange-400 transition-colors"
        style={{ width: `${(currentFormat ? FORMAT_EMOJI[currentFormat] + " " : "").length + formatLabel.length + 2}ch` }}
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
        className="inline-block bg-transparent border-b-2 border-purple-500/50 text-purple-300 font-semibold focus:outline-none focus:border-purple-400 cursor-pointer appearance-none text-center px-1 hover:border-purple-400 transition-colors"
        style={{ width: `${String(currentRadius).length + 1}ch` }}
      >
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <span>miles of Philly in the next</span>

      {/* Time selector */}
      <select
        value={currentDays}
        onChange={(e) => updateParam("days", e.target.value)}
        className="inline-block bg-transparent border-b-2 border-pink-500/50 text-pink-300 font-semibold focus:outline-none focus:border-pink-400 cursor-pointer appearance-none text-center px-1 hover:border-pink-400 transition-colors"
        style={{ width: `${timeLabel.length + 2}ch` }}
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </p>
  );
}
