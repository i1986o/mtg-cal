"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import EventTable, { type EventRow } from "../../../admin/_components/EventTable";

export default function AccountEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/events");
    setEvents(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingCount = events.filter((e) => e.status === "pending").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
            My events
          </h1>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {pendingCount} pending admin review — not yet visible on the public calendar.
            </p>
          )}
        </div>
        <Link
          href="/account/events/new"
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
        >
          + New event
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <EventTable
          events={events}
          editHref={(id) => `/account/events/${encodeURIComponent(id)}/edit`}
          deleteEndpoint={(id) => `/api/account/events/${encodeURIComponent(id)}`}
          showSourceFilter={false}
          onChange={load}
        />
      )}
    </div>
  );
}
