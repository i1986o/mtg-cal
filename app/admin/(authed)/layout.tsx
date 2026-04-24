import Sidebar from "../_components/Sidebar";
import RoleBadge from "../_components/RoleBadge";
import LogoutButton from "../_components/LogoutButton";
import { getCurrentUser } from "@/lib/session";
import { countPendingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware ensures only sessioned requests reach this layout.
  const user = await getCurrentUser();
  const pendingCount = countPendingEvents();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="text-sm font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
            PlayIRL Admin
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {user?.name ?? user?.email ?? "Signed in"}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <RoleBadge role={user?.role ?? "admin"} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar pendingCount={pendingCount} />
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
