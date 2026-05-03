import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getUserSessions } from "@/lib/users";
import { getEventsByOwner } from "@/lib/events";
import { getSavedEvents } from "@/lib/event-saves";
import { listSourcesForUser } from "@/lib/user-sources";
import { getActionsForUser } from "@/lib/admin-actions";
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
  const saved = getSavedEvents(id);
  const sources = listSourcesForUser(id);
  const actions = getActionsForUser(id);

  const submitted = events.filter((e) => e.source_type === "user" || e.source_type === "organizer");
  const synced = events.filter((e) => e.source_type === "user-discord");

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
          {user.name ?? user.email}
        </h1>
        <Link href="/admin/users" className="text-sm text-amber-700 dark:text-amber-400 hover:underline">
          ← Back to users
        </Link>
      </div>

      <section className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <Field label="Role" value={<RoleBadge role={user.role} />} />
          <Field
            label="Status"
            value={
              user.suspended ? (
                <span className="text-red-600 dark:text-red-400">Suspended</span>
              ) : (
                "Active"
              )
            }
          />
          <Field label="Created" value={new Date(user.created_at).toLocaleString()} />
          <Field label="Last login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "—"} />
        </div>
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-stone-800">
          <UserActions
            user={{
              id: user.id,
              role: user.role,
              suspended: !!user.suspended,
              suspended_reason: user.suspended_reason ?? "",
            }}
            sessionCount={sessions.length}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Submitted events ({submitted.length})
          </h2>
          {submitted.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None.</p>
          ) : (
            <ul className="space-y-2">
              {submitted.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={e.status} />
                  <Link
                    href={`/admin/events/${encodeURIComponent(e.id)}/edit`}
                    className="text-gray-900 dark:text-gray-100 hover:underline truncate flex-1"
                  >
                    {e.title}
                  </Link>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{e.date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Discord-synced events ({synced.length})
          </h2>
          {synced.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None.</p>
          ) : (
            <ul className="space-y-2">
              {synced.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={e.status} />
                  <Link
                    href={`/admin/events/${encodeURIComponent(e.id)}/edit`}
                    className="text-gray-900 dark:text-gray-100 hover:underline truncate flex-1"
                  >
                    {e.title}
                  </Link>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{e.date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Connected sources ({sources.length})
          </h2>
          {sources.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 rounded uppercase">
                    {s.kind}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 truncate flex-1">{s.label}</span>
                  {!s.enabled && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">paused</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Saved events ({saved.length})
          </h2>
          {saved.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {saved.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400 shrink-0">{e.date}</span>
                  <Link
                    href={`/event/${encodeURIComponent(e.id)}`}
                    className="text-gray-900 dark:text-gray-100 hover:underline truncate"
                  >
                    {e.title}
                  </Link>
                </li>
              ))}
              {saved.length > 10 && (
                <li className="text-xs text-gray-500 dark:text-gray-400">…and {saved.length - 10} more</li>
              )}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Admin audit log ({actions.length})
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No admin actions logged for this user yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {actions.map((a) => (
              <li key={a.id} className="py-2 flex items-start gap-3 text-sm">
                <span className="font-mono text-[11px] text-gray-400 shrink-0 w-32">
                  {new Date(a.created_at).toLocaleString()}
                </span>
                <span className="font-mono text-xs bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-gray-300 px-1.5 rounded shrink-0">
                  {a.action}
                </span>
                <span className="text-gray-600 dark:text-gray-400 flex-1">
                  by {a.admin_name || a.admin_email || "unknown"}
                  {a.reason && <span className="text-gray-500 dark:text-gray-500"> — {a.reason}</span>}
                </span>
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
