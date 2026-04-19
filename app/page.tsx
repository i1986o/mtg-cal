export const dynamic = "force-dynamic";

import { getActiveEvents, getFormats, getSetting, setSetting } from "@/lib/events";
import { config } from "@/lib/config";
import Link from "next/link";
import FloatingActions from "./floating-actions";
import RadiusSelector from "./radius-selector";
import StoreLink from "./store-link";
import StickyBar from "./sticky-bar";

// Format emoji mapping for fun visual flair
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

// Badge colors for event cards — light and dark
const FORMAT_BADGE: Record<string, string> = {
  Commander: "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
  Modern: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  Standard: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
  Pioneer: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30",
  Legacy: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
  Pauper: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30",
  Draft: "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30",
  Sealed: "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30",
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
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatted = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  if (dateStr === today.toISOString().split("T")[0]) return `Today, ${formatted}`;
  if (dateStr === tomorrow.toISOString().split("T")[0]) return `Tomorrow, ${formatted}`;

  return formatted;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; radius?: string; days?: string }>;
}) {
  const params = await searchParams;
  const currentRadius = params.radius ? parseInt(params.radius, 10) : parseInt(getSetting("search_radius_miles") || "10", 10);
  const currentDays = params.days ? parseInt(params.days, 10) : 60;
  if (params.radius) setSetting("search_radius_miles", params.radius);
  const today = new Date();
  const toDate = new Date(today.getTime() + currentDays * 24 * 60 * 60 * 1000);
  const formats = getFormats();
  const events = getActiveEvents({
    format: params.format || undefined,
    from: today.toISOString().split("T")[0],
    to: toDate.toISOString().split("T")[0],
    radiusMiles: currentRadius,
    centerLat: config.location.lat,
    centerLng: config.location.lng,
  });

  const grouped: Record<string, typeof events> = {};
  for (const ev of events) {
    if (!grouped[ev.date]) grouped[ev.date] = [];
    grouped[ev.date].push(ev);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <FloatingActions />

      {/* Hero header */}
      <header className="mb-6 flex flex-col items-center text-center gap-3">
        <h1 className="text-7xl md:text-8xl font-[family-name:var(--font-ultra)] font-extrabold text-gray-900 dark:text-white tracking-tighter leading-none">
          PlayIRL.gg
        </h1>
      </header>

      {/* Sticky filter bar */}
      <StickyBar>
        <RadiusSelector currentRadius={currentRadius} currentDays={currentDays} currentFormat={params.format} formats={formats} eventCount={events.length} />
      </StickyBar>

      {/* Events by date */}
      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{"\uD83C\uDFB4"}</p>
          <p className="text-gray-400 text-lg">No events found</p>
          <p className="text-gray-500 text-sm mt-1">Try expanding your distance or time range</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date} className="mb-6">
          <h2 className="text-xl font-[family-name:var(--font-ultra)] font-bold text-gray-800 dark:text-gray-200 tracking-tight pb-2 mb-3 pt-2">
            {formatDateHeading(date)}
          </h2>
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/event/${encodeURIComponent(ev.id)}`}
                className="group block bg-white dark:bg-[#0c1220] hover:bg-gray-50 dark:hover:bg-[#141c2e] border border-gray-100 dark:border-white/8 rounded-xl p-4 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${FORMAT_BADGE[ev.format] || "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30"}`}>
                        {FORMAT_EMOJI[ev.format] || "\uD83C\uDCCF"} {ev.format || "MTG"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(ev.time)} UTC</span>
                    </div>
                    <h3 className="font-[family-name:var(--font-ultra)] font-bold text-xl tracking-tight text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors">{ev.title}</h3>
                    {ev.location && (
                      <StoreLink name={ev.location} url={ev.store_url || undefined} />
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-base font-[family-name:var(--font-ultra)] font-bold ${ev.cost === "Free" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                      {ev.cost === "Free" ? "\u2728 Free" : ev.cost || "\u2014"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <footer className="mt-16 pt-6 border-t border-gray-100 dark:border-white/5 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>{"\uD83C\uDCCF"} PlayIRL.GG</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
          Data from Wizards of the Coast &amp; Discord &middot;{" "}
          <a href="https://github.com/i1986o/mtg-cal" className="text-blue-500 dark:text-purple-400 hover:underline">Open Source</a>
        </p>
      </footer>
    </main>
  );
}
