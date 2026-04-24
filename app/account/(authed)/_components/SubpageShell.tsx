import Link from "next/link";
import AccountChip from "../../../account-chip";

/**
 * Shared wrapper for /account/* sub-pages (everything except the main feed).
 * Matches the public homepage's centered, max-width layout and renders the
 * AccountChip/menu in the top-right corner. Gives each sub-page a small
 * "back to feed" breadcrumb so users don't need a sidebar to navigate.
 */
export default function SubpageShell({
  title,
  description,
  actions,
  children,
  maxWidth = "max-w-3xl",
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <main className={`w-full ${maxWidth} mx-auto px-4 py-8 space-y-6`}>
      <AccountChip />

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to home
      </Link>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-[family-name:var(--font-ultra)] font-light text-gray-900 dark:text-gray-100 leading-none"
            style={{ letterSpacing: "0.02em" }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </header>

      {children}
    </main>
  );
}
