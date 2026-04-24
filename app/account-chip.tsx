import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import AccountMenu from "./account-menu";

export default async function AccountChip() {
  const user = await getCurrentUser();
  const signedIn = !!user && !user.suspended;

  if (!signedIn) {
    return (
      <Link
        href="/account/login"
        title="Sign in"
        aria-label="Sign in"
        className="fixed top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#1a2438]/90 backdrop-blur-sm border border-gray-200 dark:border-white/15 shadow-sm hover:shadow-md text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition"
      >
        <UserIcon />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <AccountMenu
      displayName={user.name?.split(" ")[0] ?? "Account"}
      role={user.role}
    />
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
