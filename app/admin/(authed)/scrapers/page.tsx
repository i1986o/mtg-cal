"use client";
import { useEffect, useState } from "react";

interface Settings {
  scrape_interval_hours: string;
  last_scrape: string;
  last_scrape_result: string;
}

export default function ScrapersPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<string>("");

  async function loadSettings() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setSettings(await res.json());
  }
  useEffect(() => { loadSettings(); }, []);

  async function runScrape() {
    setRefreshing(true);
    setResult("");
    const res = await fetch("/api/admin/refresh", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setResult(`Scraped ${data.scraped} · deduped to ${data.deduped} · +${data.added} new · ~${data.updated} updated · ${data.skipped} skipped · ${data.archived} archived`);
      loadSettings();
    } else {
      setResult(`Error: ${data.error}`);
    }
    setRefreshing(false);
  }

  async function saveInterval(hours: number) {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrape_interval_hours: hours }),
    });
    loadSettings();
  }

  const last = settings?.last_scrape ? new Date(settings.last_scrape).toLocaleString() : "never";

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 mb-6">
        Scrapers
      </h1>

      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Manual refresh</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Last run: <span className="font-mono">{last}</span>
        </p>
        <button
          onClick={runScrape}
          disabled={refreshing}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition"
        >
          {refreshing ? "Scraping…" : "Refresh now"}
        </button>
        {result && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 font-mono">{result}</p>
        )}
      </section>

      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Auto-refresh interval</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">How often the scheduled task runs (the CI cron also runs independently).</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={168}
            value={settings?.scrape_interval_hours ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, scrape_interval_hours: e.target.value } : s)}
            className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">hours</span>
          <button
            onClick={() => saveInterval(Number(settings?.scrape_interval_hours ?? 24))}
            className="ml-3 text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
