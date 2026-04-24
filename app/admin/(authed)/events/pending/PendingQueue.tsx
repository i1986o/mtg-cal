"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PendingEventRow } from "@/lib/events";

export default function PendingQueue({ events }: { events: PendingEventRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("Reject this submission? It will be deleted.")) return;
    setBusyId(id);
    await fetch("/api/admin/events/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], action }),
    });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li
          key={e.id}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-center"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{e.date} {e.time}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{e.title || <em className="text-gray-400">(untitled)</em>}</span>
              {e.format && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 rounded">{e.format}</span>
              )}
              {e.source_type && (
                <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 rounded">{e.source_type}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3 flex-wrap">
              {e.location && <span>📍 {e.location}</span>}
              {e.cost && <span>💵 {e.cost}</span>}
              <span>
                Submitted by{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {e.owner_name || e.owner_email || "unknown"}
                </span>
              </span>
            </div>
            {e.notes && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{e.notes}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/admin/events/${encodeURIComponent(e.id)}/edit`}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Review
            </Link>
            <button
              onClick={() => act(e.id, "approve")}
              disabled={busyId === e.id || pending}
              className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => act(e.id, "reject")}
              disabled={busyId === e.id || pending}
              className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
