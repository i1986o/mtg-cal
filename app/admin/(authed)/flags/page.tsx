"use client";
import { useEffect, useState, useCallback } from "react";

interface Flag {
  key: string;
  enabled: number;
  description: string;
  updated_at: string;
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/flags");
    setFlags(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(flag: Flag) {
    setBusy(flag.key);
    await fetch(`/api/admin/flags/${encodeURIComponent(flag.key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !flag.enabled }),
    });
    setBusy(null);
    load();
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 mb-2">
        Feature flags
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Toggle experimental features without redeploying.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {flags.map((f) => (
            <li
              key={f.key}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start gap-4"
            >
              <button
                onClick={() => toggle(f)}
                disabled={busy === f.key}
                role="switch"
                aria-checked={f.enabled === 1}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                  f.enabled === 1 ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    f.enabled === 1 ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{f.key}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.description || <em>(no description)</em>}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Updated {new Date(f.updated_at + "Z").toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
