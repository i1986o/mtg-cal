"use client";
import { useState } from "react";
import { Button } from "./button";

export default function SubscribeButton() {
  const [showToast, setShowToast] = useState(false);

  function handleClick() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  return (
    <div className="relative">
      <Button onClick={handleClick} title="Subscribe" aria-label="Subscribe">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Subscribe
      </Button>
      {showToast && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-lg text-sm text-gray-900 dark:text-white font-medium shadow-lg whitespace-nowrap pointer-events-none z-50">
          {"\uD83D\uDCC5"} Subscribe coming soon!
        </div>
      )}
    </div>
  );
}
