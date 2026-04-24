"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface EventRow {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  location: string;
  cost: string;
  status: string;
  notes: string;
}

export default function AccountEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/events");
    setEvents(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setBusyId(id);
    await fetch(`/api/account/events/${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const pending = events.filter((e) => e.status === "pending");
  const upcoming = events.filter((e) => e.status !== "pending" && e.date >= today);
  const past = events.filter((e) => e.status !== "pending" && e.date < today);

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
            My events
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Events you've submitted or imported from your Discord sources.
          </p>
        </div>
        <Link
          href="/account/events/new"
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
        >
          + Submit event
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : events.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't created any events yet.</p>
          <Link
            href="/account/events/new"
            className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Submit your first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Section
              title="Pending admin review"
              count={pending.length}
              hint="These aren't visible on the public calendar yet."
              events={pending}
              busyId={busyId}
              onRemove={remove}
            />
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length} events={upcoming} busyId={busyId} onRemove={remove} />
          )}
          {past.length > 0 && (
            <Section title="Past" count={past.length} events={past} busyId={busyId} onRemove={remove} dim />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  hint,
  events,
  busyId,
  onRemove,
  dim = false,
}: {
  title: string;
  count: number;
  hint?: string;
  events: EventRow[];
  busyId: string | null;
  onRemove: (id: string) => void;
  dim?: boolean;
}) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">· {count}</span>
        </h2>
        {hint && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{hint}</p>}
      </div>
      <ul
        className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 ${
          dim ? "opacity-70" : ""
        }`}
      >
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {e.date}
                  {e.time ? ` · ${e.time}` : ""}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {e.title || <em className="text-gray-400">(untitled)</em>}
                </span>
                {e.format && (
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 rounded">
                    {e.format}
                  </span>
                )}
                <StatusPill status={e.status} />
              </div>
              {e.location && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">📍 {e.location}</div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/account/events/${encodeURIComponent(e.id)}/edit`}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Edit
              </Link>
              <button
                onClick={() => onRemove(e.id)}
                disabled={busyId === e.id}
                className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "Live",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    },
    pinned: {
      label: "Pinned",
      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    },
    pending: {
      label: "Pending review",
      cls: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    },
    skip: {
      label: "Hidden",
      cls: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    },
  };
  const style = map[status] ?? map.active;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style.cls}`}>{style.label}</span>;
}
