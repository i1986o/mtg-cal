export const dynamic = "force-dynamic";

import { getActiveEvents, getFormats, getSetting, setSetting } from "@/lib/events";
import { config } from "@/lib/config";
import Link from "next/link";
import SubscribeButton from "./subscribe-modal";
import FormatFilter from "./format-filter";
import RadiusSelector from "./radius-selector";

// Badge colors for event cards — outlined to match filter pills
const FORMAT_BADGE: Record<string, string> = {
  Commander: "border border-purple-400 text-purple-600 dark:border-purple-500 dark:text-purple-400",
  Modern: "border border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400",
  Standard: "border border-green-400 text-green-600 dark:border-green-500 dark:text-green-400",
  Pioneer: "border border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400",
  Legacy: "border border-red-400 text-red-600 dark:border-red-500 dark:text-red-400",
  Pauper: "border border-yellow-400 text-yellow-600 dark:border-yellow-500 dark:text-yellow-400",
  Draft: "border border-cyan-400 text-cyan-600 dark:border-cyan-500 dark:text-cyan-400",
  Sealed: "border border-pink-400 text-pink-600 dark:border-pink-500 dark:text-pink-400",
};

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; radius?: string }>;
}) {
  const params = await searchParams;
  const currentRadius = params.radius ? parseInt(params.radius, 10) : parseInt(getSetting("search_radius_miles") || "10", 10);
  // Save radius preference
  if (params.radius) setSetting("search_radius_miles", params.radius);
  const formats = getFormats();
  const events = getActiveEvents({
    format: params.format || undefined,
    from: new Date().toISOString().split("T")[0],
    radiusMiles: currentRadius,
    centerLat: config.location.lat,
    centerLng: config.location.lng,
  });

  // Group events by date
  const grouped: Record<string, typeof events> = {};
  for (const ev of events) {
    if (!grouped[ev.date]) grouped[ev.date] = [];
    grouped[ev.date].push(ev);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MTG Events — Philadelphia</h1>
          <RadiusSelector currentRadius={currentRadius} eventCount={events.length} />
        </div>
        <SubscribeButton />
      </header>

      <FormatFilter formats={formats} activeFormat={params.format} />

      {/* Events by date */}
      {Object.keys(grouped).length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">No upcoming events found.</p>
      )}

      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date} className="mb-8">
          <h2 className="sticky top-12 z-[5] bg-white/90 dark:bg-black/90 backdrop-blur-sm text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 pt-2 -mx-4 px-4">
            {formatDateHeading(date)}
          </h2>
          <div className="space-y-3">
            {dayEvents.map((ev) => (
              <Link key={ev.id} href={`/event/${encodeURIComponent(ev.id)}`} className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${FORMAT_BADGE[ev.format] || "border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400"}`}>
                        {ev.format || "MTG"}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{formatTime(ev.time)} UTC</span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{ev.title}</h3>
                    {ev.location && (
                      <p className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {ev.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-medium ${ev.cost === "Free" ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {ev.cost || "—"}
                    </span>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">View &rarr;</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-400">
        Powered by <a href="https://github.com/i1986o/mtg-cal" className="text-blue-500 dark:text-blue-400 hover:underline">mtg-cal</a>
        {" — "}Data from Wizards of the Coast &amp; Discord
      </footer>
    </main>
  );
}
