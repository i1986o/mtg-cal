"use client";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];
const TIME_OPTIONS = [
  { value: "7", label: "this week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "this month" },
  { value: "60", label: "2 months" },
  { value: "90", label: "3 months" },
];

export default function RadiusSelector({
  currentRadius,
  currentDays,
  eventCount,
}: {
  currentRadius: number;
  currentDays: number;
  eventCount: number;
}) {
  function handleRadiusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href);
    url.searchParams.set("radius", e.target.value);
    window.location.href = url.toString();
  }

  function handleDaysChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href);
    url.searchParams.set("days", e.target.value);
    window.location.href = url.toString();
  }

  const timeLabel = TIME_OPTIONS.find(t => t.value === String(currentDays))?.label || `${currentDays} days`;

  return (
    <p className="text-gray-400 mt-2 flex items-center gap-1.5 flex-wrap text-base">
      <span className="text-white font-semibold">{eventCount}</span>
      <span>events within</span>
      <select
        value={currentRadius}
        onChange={handleRadiusChange}
        className="inline-block bg-transparent border-b-2 border-purple-500/50 text-purple-300 font-semibold focus:outline-none focus:border-purple-400 cursor-pointer appearance-none text-center px-1 hover:border-purple-400 transition-colors"
        style={{ width: `${String(currentRadius).length + 7}ch` }}
      >
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>{r} miles</option>
        ))}
      </select>
      <span>of Philly,</span>
      <select
        value={currentDays}
        onChange={handleDaysChange}
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
