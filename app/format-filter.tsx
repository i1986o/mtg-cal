"use client";

const FORMAT_ACTIVE: Record<string, string> = {
  Commander: "bg-purple-600 text-white dark:bg-purple-500",
  Modern: "bg-blue-600 text-white dark:bg-blue-500",
  Standard: "bg-green-600 text-white dark:bg-green-500",
  Pioneer: "bg-orange-600 text-white dark:bg-orange-500",
  Legacy: "bg-red-600 text-white dark:bg-red-500",
  Pauper: "bg-yellow-500 text-white dark:bg-yellow-500",
  Draft: "bg-cyan-600 text-white dark:bg-cyan-500",
  Sealed: "bg-pink-600 text-white dark:bg-pink-500",
};

const FORMAT_INACTIVE: Record<string, string> = {
  Commander: "border-purple-400 text-purple-600 dark:border-purple-500 dark:text-purple-400",
  Modern: "border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400",
  Standard: "border-green-400 text-green-600 dark:border-green-500 dark:text-green-400",
  Pioneer: "border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400",
  Legacy: "border-red-400 text-red-600 dark:border-red-500 dark:text-red-400",
  Pauper: "border-yellow-400 text-yellow-600 dark:border-yellow-500 dark:text-yellow-400",
  Draft: "border-cyan-400 text-cyan-600 dark:border-cyan-500 dark:text-cyan-400",
  Sealed: "border-pink-400 text-pink-600 dark:border-pink-500 dark:text-pink-400",
};

export default function FormatFilter({ formats, activeFormat }: { formats: string[]; activeFormat?: string }) {
  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    window.location.href = val ? `/?format=${encodeURIComponent(val)}` : "/";
  }

  return (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm py-3 -mx-4 px-4 mb-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Format</p>

      {/* Mobile: dropdown */}
      <div className="md:hidden">
        <select
          value={activeFormat || ""}
          onChange={handleSelect}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Formats</option>
          {formats.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Desktop: pills */}
      <div className="hidden md:flex flex-wrap gap-2">
        <a
          href="/"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
            !activeFormat
              ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
              : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          All
        </a>
        {formats.map((f) => (
          <a
            key={f}
            href={`/?format=${encodeURIComponent(f)}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              activeFormat === f
                ? (FORMAT_ACTIVE[f] || "bg-gray-900 text-white") + " border-transparent"
                : (FORMAT_INACTIVE[f] || "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400") + " bg-transparent hover:opacity-80"
            }`}
          >
            {f}
          </a>
        ))}
      </div>
    </div>
  );
}
