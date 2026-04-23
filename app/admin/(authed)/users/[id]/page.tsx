import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getUserSessions } from "@/lib/users";
import { getEventsByOwner } from "@/lib/events";
import { requireRole } from "@/lib/session";
import RoleBadge from "../../../_components/RoleBadge";
import StatusBadge from "../../../_components/StatusBadge";
import UserActions from "./UserActions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const user = getUser(id);
  if (!user) notFound();

  const events = getEventsByOwner(id);
  const sessions = getUserSessions(id);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
          {user.name ?? user.email}
        </h1>
        <Link href="/admin/users" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to users
        </Link>
      </div>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <Field label="Role" value={<RoleBadge role={user.role} />} />
          <Field label="Status" value={user.suspended ? <span className="text-red-600 dark:text-red-400">Suspended</span> : "Active"} />
          <Field label="Created" value={new Date(user.created_at).toLocaleString()} />
          <Field label="Last login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "—"} />
        </div>
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
          <UserActions user={{ id: user.id, role: user.role, suspended: !!user.suspended }} sessionCount={sessions.length} />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Owned events ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No events owned by this user.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <StatusBadge status={e.status} />
                <Link href={`/admin/events/${encodeURIComponent(e.id)}/edit`} className="text-gray-900 dark:text-gray-100 hover:underline">
                  {e.title}
                </Link>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{e.date} {e.time}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className="text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
