"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserSource } from "@/lib/user-sources";

export default function SourcesList({ sources }: { sources: UserSource[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(id: string, enabled: boolean) {
    setBusyId(id);
    await fetch(`/api/account/sources/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Remove this source? Events already imported will remain but won't be refreshed.")) return;
    setBusyId(id);
    await fetch(`/api/account/sources/${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  if (sources.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No sources connected yet. Invite the bot to your Discord server, then click{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">I've added it — pick a server</span> above.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((s) => (
        <li
          key={s.id}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-center"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-gray-100">{s.label}</span>
              <span className="text-[11px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 rounded uppercase">
                {s.kind}
              </span>
              {!s.enabled && (
                <span className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 rounded uppercase">
                  paused
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3 flex-wrap">
              {s.venue_name && <span>📍 {s.venue_name}</span>}
              {s.venue_address && <span className="truncate">{s.venue_address}</span>}
              <span>
                {s.last_synced_at ? `Last synced ${s.last_synced_at}` : "Never synced yet"}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => toggle(s.id, !s.enabled)}
              disabled={busyId === s.id || pending}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {s.enabled ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => remove(s.id)}
              disabled={busyId === s.id || pending}
              className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
