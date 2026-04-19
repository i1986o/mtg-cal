"use client";
import { useState, useEffect, useRef } from "react";
import SubscribeModal from "./subscribe-modal-content";
import AboutModal from "./about-modal";

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

const BTN = "group flex items-center justify-center w-10 h-10 bg-white dark:bg-[#0e2240] text-gray-400 dark:text-gray-500 rounded-xl border border-gray-200 dark:border-[#1a3558] transition-all duration-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#132c50] hover:border-gray-300 dark:hover:border-[#1a3558] hover:text-gray-600 dark:hover:text-gray-300";

export default function FloatingActions() {
  const [showCalModal, setShowCalModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [toast, setToast] = useState<{ message: string; top: number } | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
      setIsDark(false);
    } else {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
      setIsDark(true);
    }
  }

  function showToastMsg(message: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setToast({ message, top: rect.top + rect.height / 2 });
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <>
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <button onClick={() => setShowAbout(true)} title="About PlayIRL.GG" className={BTN}>
          <InfoIcon />
        </button>
        <button onClick={() => setShowCalModal(true)} title="Subscribe" className={BTN}>
          <CalendarIcon />
        </button>
        <a href="https://discord.gg/axDSujPTfj" target="_blank" rel="noopener noreferrer" title="Discord" className={BTN}>
          <DiscordIcon />
        </a>
        <button onClick={(e) => showToastMsg("\u2709\uFE0F Newsletter coming soon!", e)} title="Email" className={BTN}>
          <EmailIcon />
        </button>

        <div className="w-6 mx-auto border-t border-gray-200 dark:border-[#1a3558]" />

        <button onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} className={BTN}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {toast && (
        <div
          className="fixed right-16 z-50 px-3 py-2 bg-white dark:bg-[#0e2240] border border-gray-200 dark:border-[#1a3558] rounded-lg text-sm text-gray-900 dark:text-white font-medium shadow-lg animate-[fadeInUp_0.2s_ease-out] whitespace-nowrap"
          style={{ top: toast.top, transform: "translateY(-50%)" }}
        >
          {toast.message}
        </div>
      )}

      {showCalModal && <SubscribeModal onClose={() => setShowCalModal(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}
