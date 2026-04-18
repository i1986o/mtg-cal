"use client";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

export default function RadiusSelector({ currentRadius, eventCount }: { currentRadius: number; eventCount: number }) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set("radius", val);
    window.location.href = url.toString();
  }

  return (
    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 flex-wrap">
      <span>{eventCount} upcoming events within</span>
      <select
        value={currentRadius}
        onChange={handleChange}
        className="inline-block bg-transparent border-b border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer appearance-none text-center px-1"
        style={{ width: `${String(currentRadius).length + 7}ch` }}
      >
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>{r} miles</option>
        ))}
      </select>
    </p>
  );
}
