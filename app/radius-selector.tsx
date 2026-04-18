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
    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 flex-wrap">
      <span>{eventCount} events within</span>
      <select
        value={currentRadius}
        onChange={handleRadiusChange}
        className="inline-block bg-transparent border-b border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer appearance-none text-center px-1"
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
        className="inline-block bg-transparent border-b border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer appearance-none text-center px-1"
        style={{ width: `${timeLabel.length + 2}ch` }}
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </p>
  );
}
