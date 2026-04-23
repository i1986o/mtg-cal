"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserActions({
  user,
  sessionCount,
}: {
  user: { id: string; role: string; suspended: boolean };
  sessionCount: number;
}) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);

  async function saveRole() {
    setBusy(true);
    await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(false);
    router.refresh();
  }

  async function toggleSuspend() {
    if (!user.suspended && !confirm("Suspending will also revoke all active sessions. Continue?")) return;
    setBusy(true);
    await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !user.suspended }),
    });
    setBusy(false);
    router.refresh();
  }

  async function revokeSessions() {
    if (!confirm(`Revoke all ${sessionCount} session(s)?`)) return;
    setBusy(true);
    await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/sessions`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3 items-center text-sm">
      <label className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Change role:</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="user">user</option>
          <option value="organizer">organizer</option>
          <option value="admin">admin</option>
        </select>
        <button
          onClick={saveRole}
          disabled={busy || role === user.role}
          className="text-xs px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          Save
        </button>
      </label>

      <button
        onClick={revokeSessions}
        disabled={busy || sessionCount === 0}
        className="text-xs px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        Revoke sessions ({sessionCount})
      </button>

      <button
        onClick={toggleSuspend}
        disabled={busy}
        className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950 disabled:opacity-50"
      >
        {user.suspended ? "Restore access" : "Suspend user"}
      </button>
    </div>
  );
}
