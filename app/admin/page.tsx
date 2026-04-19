"use client";
import { useState, useEffect, useCallback } from "react";

interface Event {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  location: string;
  cost: string;
  source: string;
  status: string;
  notes: string;
}

interface Settings {
  scrape_interval_hours: string;
  last_scrape: string;
  last_scrape_result: string;
}

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "active" | "skip" | "pinned">("all");

  const loadData = useCallback(async () => {
    const [evRes, setRes] = await Promise.all([
      fetch("/api/admin/events"),
      fetch("/api/admin/settings"),
    ]);
    if (evRes.status === 401 || setRes.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setEvents(await evRes.json());
    setSettings(await setRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshResult("");
    const res = await fetch("/api/admin/refresh", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setRefreshResult(`Scraped ${data.scraped} → ${data.deduped} deduped. +${data.added} new, ~${data.updated} updated.`);
      loadData();
    } else {
      setRefreshResult(`Error: ${data.error}`);
    }
    setRefreshing(false);
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadData();
  }

  const filteredEvents = filter === "all"
    ? events
    : events.filter((e) => e.status === filter);

  const lastResult = settings?.last_scrape_result
    ? (() => { try { return JSON.parse(settings.last_scrape_result); } catch { return null; } })()
    : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <a href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to events</a>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {refreshing ? "Refreshing..." : "Refresh Now"}
          </button>
          {refreshResult && (
            <span className="text-sm text-gray-600 dark:text-gray-400">{refreshResult}</span>
          )}
        </div>
        {settings && (
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>Auto-refresh every <strong>{settings.scrape_interval_hours}h</strong></p>
            {settings.last_scrape && (
              <p>Last scrape: {new Date(settings.last_scrape).toLocaleString()}</p>
            )}
            {lastResult && (
              <p>Result: {lastResult.scraped} scraped, {lastResult.added} new, {lastResult.updated} updated</p>
            )}
          </div>
        )}
      </div>

      {/* Event list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Events ({filteredEvents.length})</h2>
          <div className="flex gap-2 ml-auto">
            {(["all", "active", "skip", "pinned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filter === f
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{ev.source}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 rounded">{ev.format}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ev.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ev.date} {ev.time} — {ev.location}</p>
              </div>
              <select
                value={ev.status}
                onChange={(e) => handleStatusChange(ev.id, e.target.value)}
                className={`text-xs px-2 py-1 rounded border ${
                  ev.status === "active"
                    ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                    : ev.status === "skip"
                    ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
                    : "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300"
                }`}
              >
                <option value="active">active</option>
                <option value="skip">skip</option>
                <option value="pinned">pinned</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
