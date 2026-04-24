import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveEvents, getEventsByOwner, getFormats } from "@/lib/events";
import { config } from "@/lib/config";
import { getPreferences } from "@/lib/user-preferences";
import { getSavedEventIds, countSavedEvents } from "@/lib/event-saves";
import { listSourcesForUser } from "@/lib/user-sources";
import DayCard from "../../day-card";

export const dynamic = "force-dynamic";

function dayHeadingLabel(dateStr: string, todayStr: string, tomorrowStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (dateStr === todayStr) return `Today · ${weekday}, ${monthDay}`;
  if (dateStr === tomorrowStr) return `Tomorrow · ${weekday}, ${monthDay}`;
  return `${weekday}, ${monthDay}`;
}

export default async function AccountDashboard() {
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
  const myUpcoming = myEvents.filter((e) => e.date >= todayStr).length;
  const sourceCount = listSourcesForUser(user.id).length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
            Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your feed of upcoming MTG events, filtered to your interests.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/account/events/new"
            className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
          >
            + Submit event
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="In your feed" value={events.length} href="#feed" />
        <StatTile label="Saved" value={savedCount} href="/account/saved" />
        <StatTile
          label="My events"
          value={myUpcoming}
          sub={myPending > 0 ? `${myPending} pending` : undefined}
          href="/account/events"
        />
        <StatTile label="Event sources" value={sourceCount} href="/account/sources" />
      </section>

      <section id="feed" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Your feed</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <FilterSummary prefs={prefs} totalFormats={formats.length} />{" "}
              <Link href="/account/preferences" className="text-blue-600 dark:text-blue-400 hover:underline">
                edit preferences
              </Link>
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <p className="text-4xl mb-3">🎴</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No events match your preferences right now.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Try widening your radius or days-ahead window in{" "}
              <Link href="/account/preferences" className="text-blue-600 dark:text-blue-400 hover:underline">
                preferences
              </Link>.
            </p>
          </div>
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
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition">
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {sub && <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function FilterSummary({
  prefs,
  totalFormats,
}: {
  prefs: ReturnType<typeof getPreferences>;
  totalFormats: number;
}) {
  const fmts =
    prefs.formats.length === 0
      ? `all ${totalFormats} formats`
      : prefs.formats.length === 1
        ? prefs.formats[0]
        : `${prefs.formats.length} formats`;
  return (
    <>
      Showing <span className="text-gray-700 dark:text-gray-300">{fmts}</span> within{" "}
      <span className="text-gray-700 dark:text-gray-300">{prefs.radius_miles} mi</span> over the next{" "}
      <span className="text-gray-700 dark:text-gray-300">{prefs.days_ahead} days</span>.
    </>
  );
}
