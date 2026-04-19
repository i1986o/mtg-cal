"use client";

export default function ViewToggle({ currentView }: { currentView: string }) {
  function setView(view: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.location.href = url.toString();
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
      <button
        onClick={() => setView("list")}
        title="List view"
        className={`p-1.5 rounded-md transition-all ${currentView === "list" ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        onClick={() => setView("calendar")}
        title="Calendar view"
        className={`p-1.5 rounded-md transition-all ${currentView === "calendar" ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
