"use client";

// Tiny client component: the "Change location" button rendered in the
// homepage empty-state when the user is on the global default location.
// Server component (app/page.tsx) can't host onClick directly, so this
// is the minimal client island.

export default function EmptyStateLocationCta() {
  function openPicker() {
    if (typeof window === "undefined") return;
    const trigger = document.querySelector<HTMLButtonElement>(
      'button[title*="location" i], button[title*="change" i]',
    );
    if (trigger) {
      trigger.scrollIntoView({ behavior: "smooth", block: "center" });
      // Slight delay so the scroll lands before the popover opens.
      setTimeout(() => trigger.click(), 250);
    }
  }

  return (
    <button
      onClick={openPicker}
      className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 dark:bg-amber-500 text-white text-xs font-medium hover:bg-amber-700 dark:hover:bg-amber-400 transition cursor-pointer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Change location
    </button>
  );
}
