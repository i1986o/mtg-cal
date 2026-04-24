import Link from "next/link";
import { requireRole, type CurrentUser } from "@/lib/session";
import RoleBadge from "../../admin/_components/RoleBadge";
import AccountLogout from "./AccountLogout";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user: CurrentUser = await requireRole(["user", "organizer", "admin"]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="text-sm font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
            PlayIRL Account
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.name ?? user.email ?? "Signed in"}</div>
          <div className="mt-2">
            <RoleBadge role={user.role} />
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3" aria-label="Account">
          <Link
            href="/account"
            className="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Your feed
          </Link>
          <Link
            href="/account/saved"
            className="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Saved events
          </Link>
          <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
          <Link
            href="/account/events"
            className="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            My events
          </Link>
          <Link
            href="/account/events/new"
            className="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            + Submit event
          </Link>
          <Link
            href="/account/sources"
            className="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Event sources
          </Link>
          <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
          <Link
            href="/account/preferences"
            className="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Preferences
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="mt-4 px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              → Admin portal
            </Link>
          )}
          <Link
            href="/"
            className="px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ← Back to site
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <AccountLogout />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
