import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import AccountMenu from "./account-menu";

// Pill container + inner-button styles mirror the theme toggle in
// `app/floating-toolbar.tsx` so the bottom-left Sign in chip and the
// bottom-right theme toggle read as a matched pair.
const PILL = "fixed bottom-6 left-4 z-40 flex bg-white dark:bg-[#1a2438] rounded-xl p-0.5 border border-gray-200 dark:border-white/15 shadow-xl shadow-black/15 dark:shadow-black/50";
const BTN = "flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300";

export default async function AccountChip() {
  const user = await getCurrentUser();
  const signedIn = !!user && !user.suspended;

  if (!signedIn) {
    return (
      <div className={PILL}>
        <Link href="/account/login" title="Sign in" aria-label="Sign in" className={BTN}>
          <UserIcon />
        </Link>
      </div>
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
      className="w-4 h-4"
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
