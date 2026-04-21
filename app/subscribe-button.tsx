"use client";
import { useState } from "react";

export default function SubscribeButton() {
  const [showToast, setShowToast] = useState(false);

  function handleClick() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        title="Subscribe"
        aria-label="Subscribe"
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/8 shadow-sm text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Subscribe
      </button>
      {showToast && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-lg text-sm text-gray-900 dark:text-white font-medium shadow-lg whitespace-nowrap pointer-events-none z-50">
          {"\uD83D\uDCC5"} Subscribe coming soon!
        </div>
      )}
    </div>
  );
}
