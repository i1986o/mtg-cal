import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getEventsByOwner } from "@/lib/events";
import StatCard from "../../admin/_components/StatCard";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboard() {
  const user = await requireRole(["organizer", "admin"]);
  const events = getEventsByOwner(user.id);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
            Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage events you've added to PlayIRL.GG.
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
        >
          + New event
        </Link>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <StatCard label="Total" value={events.length} />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Past" value={events.length - upcoming.length} />
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Recent events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You haven't created any events yet. <Link href="/organizer/events/new" className="text-blue-600 dark:text-blue-400 hover:underline">Create your first one</Link>.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-gray-400 w-20">{e.date}</span>
                <Link href={`/organizer/events/${encodeURIComponent(e.id)}/edit`} className="text-gray-900 dark:text-gray-100 hover:underline flex-1 truncate">
                  {e.title}
                </Link>
                <span className="text-xs text-gray-500 dark:text-gray-400">{e.location}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
