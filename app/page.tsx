export const dynamic = "force-dynamic";

import { getActiveEvents, getFormats, getSetting, setSetting } from "@/lib/events";
import { config } from "@/lib/config";
import Link from "next/link";
import Image from "next/image";
import SubscribeButton from "./subscribe-modal";
import FormatFilter from "./format-filter";
import RadiusSelector from "./radius-selector";

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

// Badge colors for event cards
const FORMAT_BADGE: Record<string, string> = {
  Commander: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  Modern: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  Standard: "bg-green-500/20 text-green-300 border border-green-500/30",
  Pioneer: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  Legacy: "bg-red-500/20 text-red-300 border border-red-500/30",
  Pauper: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  Draft: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  Sealed: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
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

  if (dateStr === today.toISOString().split("T")[0]) return "\uD83D\uDD25 Today";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "\uD83D\uDC4B Tomorrow";

  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
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
      {/* Subscribe button - top right */}
      <div className="flex justify-end mb-4">
        <SubscribeButton />
      </div>

      {/* Hero header */}
      <header className="mb-10 flex flex-col items-center text-center gap-3">
        <Image src="/logo.png" alt="Philly MTG" width={120} height={120} className="w-28 h-28 object-contain" />
        <RadiusSelector currentRadius={currentRadius} currentDays={currentDays} eventCount={events.length} />
      </header>

      <FormatFilter formats={formats} activeFormat={params.format} />

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
          <h2 className="sticky top-12 z-[5] bg-[#060d1f]/90 backdrop-blur-md text-base font-semibold text-gray-300 pb-2 mb-3 pt-2 -mx-4 px-4">
            {formatDateHeading(date)}
          </h2>
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/event/${encodeURIComponent(ev.id)}`}
                className="group block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 rounded-xl p-4 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${FORMAT_BADGE[ev.format] || "bg-gray-500/20 text-gray-300 border border-gray-500/30"}`}>
                        {FORMAT_EMOJI[ev.format] || "\uD83C\uDCCF"} {ev.format || "MTG"}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(ev.time)} UTC</span>
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-purple-200 transition-colors">{ev.title}</h3>
                    {ev.location && (
                      <p className="flex items-center gap-1 mt-1 text-sm text-gray-400">
                        {"\uD83D\uDCCD"} {ev.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-sm font-bold ${ev.cost === "Free" ? "text-emerald-400" : "text-white"}`}>
                      {ev.cost === "Free" ? "\u2728 Free" : ev.cost || "\u2014"}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-purple-400 transition-colors">View &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <footer className="mt-16 pt-6 border-t border-white/10 text-center text-sm text-gray-500">
        <p>{"\uD83C\uDCCF"} Built for the Philly MTG community</p>
        <p className="mt-1 text-xs text-gray-600">
          Data from Wizards of the Coast &amp; Discord &middot;{" "}
          <a href="https://github.com/i1986o/mtg-cal" className="text-purple-400 hover:underline">Open Source</a>
        </p>
      </footer>
    </main>
  );
}
