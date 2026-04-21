export const dynamic = "force-dynamic";

import { getActiveEvents, getFormats, getSetting, setSetting } from "@/lib/events";
import { config } from "@/lib/config";
import RadiusSelector from "./radius-selector";
import CalendarView from "./calendar-view";
import StickyBar from "./sticky-bar";
import ViewToggle from "./view-toggle";
import AboutInfoButton from "./about-info-button";
import SubscribeButton from "./subscribe-button";
import ThemeToggle from "./theme-toggle";
import DayCard from "./day-card";

function dayHeadingLabel(dateStr: string, todayStr: string, tomorrowStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (dateStr === todayStr) return `Today · ${weekday}, ${monthDay}`;
  if (dateStr === tomorrowStr) return `Tomorrow · ${weekday}, ${monthDay}`;
  return `${weekday}, ${monthDay}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; radius?: string; days?: string; view?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const currentRadius = params.radius ? parseInt(params.radius, 10) : parseInt(getSetting("search_radius_miles") || "10", 10);
  const currentDays = params.days ? parseInt(params.days, 10) : 7;
  const currentView = params.view || "list";
  const currentOffset = params.offset ? Math.max(0, parseInt(params.offset, 10)) : 0;
  if (params.radius) setSetting("search_radius_miles", params.radius);
  const today = new Date();
  let fromDate: Date;
  let toDate: Date;
  if (currentView === "calendar") {
    // Start-of-week (Sunday) so today's week renders fully; wide look-ahead for week nav.
    fromDate = new Date(today);
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - fromDate.getDay());
    toDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  } else {
    fromDate = new Date(today.getTime() + currentOffset * 24 * 60 * 60 * 1000);
    toDate = new Date(today.getTime() + (currentOffset + currentDays) * 24 * 60 * 60 * 1000);
  }
  const formats = getFormats();
  const events = getActiveEvents({
    format: params.format || undefined,
    from: fromDate.toISOString().split("T")[0],
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
      <div className="fixed top-4 left-4 z-40">
        <ViewToggle currentView={currentView} />
      </div>
      <div className="fixed top-4 right-4 z-40">
        <SubscribeButton />
      </div>
      <ThemeToggle />

      {/* Hero header */}
      <header className="mb-6 flex flex-col items-center text-center gap-3">
        <h1 className="text-7xl md:text-8xl font-[family-name:var(--font-ultra)] font-extrabold text-gray-900 dark:text-white tracking-tighter leading-none">
          PlayIRL.gg
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          An alternative way to find and schedule MTG events near you.
          <AboutInfoButton />
        </p>
      </header>

      {/* Sticky filter bar */}
      <StickyBar>
        <RadiusSelector currentRadius={currentRadius} currentDays={currentDays} currentFormat={params.format} formats={formats} eventCount={events.length} />
      </StickyBar>

      {currentView === "calendar" ? (
        <div
          style={{
            marginLeft: "calc(-50vw + 50%)",
            marginRight: "calc(-50vw + 50%)",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        >
          <CalendarView events={events} />
        </div>
      ) : (
        <>
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">{"\uD83C\uDFB4"}</p>
              <p className="text-gray-400 text-lg">No events found</p>
              <p className="text-gray-500 text-sm mt-1">Try expanding your distance or time range</p>
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(grouped).map(([date, dayEvents]) => {
              const d = new Date(date + "T12:00:00");
              const todayStr = today.toISOString().split("T")[0];
              const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
              return (
                <DayCard
                  key={date}
                  date={date}
                  weekday={d.toLocaleDateString("en-US", { weekday: "long" })}
                  dayNum={d.getDate()}
                  isToday={date === todayStr}
                  isPast={date < todayStr}
                  events={dayEvents}
                  headingLabel={dayHeadingLabel(date, todayStr, tomorrowStr)}
                />
              );
            })}
          </div>

          {/* Week navigation */}
          <div className="flex items-center justify-between mt-6">
            {currentOffset > 0 ? (
              <a
                href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([k]) => k !== "offset")), ...(currentOffset - 7 > 0 ? { offset: String(currentOffset - 7) } : {}) }).toString()}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Previous week
              </a>
            ) : <div />}
            <a
              href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined) as [string,string][]), offset: String(currentOffset + 7) }).toString()}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Next week
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
        </>
      )}

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
