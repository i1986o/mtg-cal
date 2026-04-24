import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveEvents, getFormats, getEventsByOwner } from "@/lib/events";
import { config } from "@/lib/config";
import { getPreferences } from "@/lib/user-preferences";
import { getSavedEventIds, countSavedEvents } from "@/lib/event-saves";
import DayCard from "../../day-card";
import StickyBar from "../../sticky-bar";
import FloatingToolbar from "../../floating-toolbar";
import Reveal from "../../reveal";
import AccountChip from "../../account-chip";

export const dynamic = "force-dynamic";

function dayHeadingLabel(dateStr: string, todayStr: string, tomorrowStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (dateStr === todayStr) return `Today · ${weekday}, ${monthDay}`;
  if (dateStr === tomorrowStr) return `Tomorrow · ${weekday}, ${monthDay}`;
  return `${weekday}, ${monthDay}`;
}

export default async function AccountFeed() {
  const user = await requireRole(["user", "organizer", "admin"]);
  const prefs = getPreferences(user.id);
  const formats = getFormats();

  const today = new Date();
  const fromDate = today.toISOString().split("T")[0];
  const toDate = new Date(today.getTime() + prefs.days_ahead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const selectedFormats = prefs.formats.length > 0 ? prefs.formats : [undefined];
  const seen = new Set<string>();
  const events = selectedFormats
    .flatMap((f) =>
      getActiveEvents({
        format: f,
        from: fromDate,
        to: toDate,
        radiusMiles: prefs.radius_miles,
        centerLat: config.location.lat,
        centerLng: config.location.lng,
      }),
    )
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const grouped: Record<string, typeof events> = {};
  for (const ev of events) (grouped[ev.date] ||= []).push(ev);

  const savedIds = getSavedEventIds(user.id);
  const savedCount = countSavedEvents(user.id);
  const myEvents = getEventsByOwner(user.id);
  const myPending = myEvents.filter((e) => e.status === "pending").length;

  const fmtSummary =
    prefs.formats.length === 0
      ? `all ${formats.length} formats`
      : prefs.formats.length === 1
        ? prefs.formats[0]
        : `${prefs.formats.length} formats`;
  const firstName = user.name?.split(" ")[0] ?? "";

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8">
      <AccountChip />
      <FloatingToolbar currentView="list" />

      <header className="mb-6 flex flex-col items-center text-center gap-1 w-full anim-fade-in-up">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-[family-name:var(--font-ultra)] font-light text-gray-900 dark:text-white leading-none"
          style={{ letterSpacing: "0.02em" }}
        >
          PlayIRL.GG
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {firstName ? `Welcome back, ${firstName}. ` : "Welcome back. "}
          Your personalized feed of MTG events.
        </p>
      </header>

      <StickyBar>
        <div className="flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-400 flex items-center justify-center flex-wrap gap-x-1.5 gap-y-1 text-sm">
            <span>Showing</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">{fmtSummary}</span>
            <span>within</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">{prefs.radius_miles} mi</span>
            <span>over the next</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">{prefs.days_ahead} days</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <Link
              href="/account/preferences"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              edit
            </Link>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">{events.length}</span>
            <span>{events.length === 1 ? "event" : "events"}</span>
          </p>
        </div>
      </StickyBar>

      {(savedCount > 0 || myPending > 0) && (
        <Reveal className="mb-6 flex flex-wrap gap-2 justify-center">
          {savedCount > 0 && (
            <Link
              href="/account/saved"
              className="text-xs px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition"
            >
              ⭐ {savedCount} saved
            </Link>
          )}
          {myPending > 0 && (
            <Link
              href="/account/events"
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c1828] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 transition"
            >
              {myPending} pending admin review
            </Link>
          )}
        </Reveal>
      )}

      {events.length === 0 ? (
        <Reveal className="text-center py-16" delay={100}>
          <p className="text-4xl mb-3">🎴</p>
          <p className="text-gray-400 text-lg">No events match your preferences</p>
          <p className="text-gray-500 text-sm mt-1">
            Try widening your radius or look-ahead in{" "}
            <Link href="/account/preferences" className="text-blue-600 dark:text-blue-400 hover:underline">
              preferences
            </Link>.
          </p>
        </Reveal>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([date, dayEvents], i) => {
            const d = new Date(date + "T12:00:00");
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
                staggerBase={Math.min(i * 60, 120)}
                signedIn
                isAdmin={user.role === "admin"}
                savedEventIds={savedIds}
              />
            );
          })}
        </div>
      )}

      <Reveal>
        <footer className="mt-16 pt-8 border-t border-gray-100 dark:border-white/5 text-sm text-gray-400 dark:text-gray-500 text-center space-y-2">
          <div className="flex flex-wrap gap-3 justify-center text-xs">
            <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition">
              Public homepage
            </Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/account/events/new" className="hover:text-gray-900 dark:hover:text-white transition">
              Submit an event
            </Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/account/sources" className="hover:text-gray-900 dark:hover:text-white transition">
              Connect a Discord
            </Link>
          </div>
        </footer>
      </Reveal>
    </main>
  );
}
