"use client";
import { useState, useEffect } from "react";

const BTN = "flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer";
const BTN_ACTIVE = "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white";
const BTN_INACTIVE = "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300";

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" />
      <circle cx="4" cy="6.75" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="17.25" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3m8-3v3M4 9h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <circle cx="8" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export default function FloatingToolbar({ currentView }: { currentView: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function setView(view: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.location.href = url.toString();
  }

  function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      html.style.colorScheme = "light";
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      html.style.colorScheme = "dark";
      setIsDark(true);
    }
  }

  const PILL = "fixed right-4 z-40 flex flex-col gap-0.5 bg-white dark:bg-[#1a2438] rounded-xl p-0.5 border border-gray-200 dark:border-white/15 shadow-xl shadow-black/15 dark:shadow-black/50";

  return (
    <>
      {/* View toggle — desktop only, vertically centered, sliding indicator */}
      <div className="hidden sm:flex fixed right-4 top-1/2 -translate-y-1/2 z-40">
        <div className="relative flex flex-col bg-gray-100/80 dark:bg-[#0e1828] rounded-2xl p-1 border border-gray-200/60 dark:border-white/10 shadow-lg shadow-black/10 dark:shadow-black/40 backdrop-blur-sm">
          {/* sliding pill */}
          <div
            className="absolute left-1 right-1 h-8 rounded-xl bg-white dark:bg-white/12 shadow-sm transition-transform duration-200 ease-out"
            style={{ top: "4px", transform: currentView === "calendar" ? "translateY(36px)" : "translateY(0px)" }}
          />
          <button
            onClick={() => setView("list")}
            title="List view"
            className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-xl transition-colors duration-150 cursor-pointer ${currentView === "list" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"}`}
          >
            <ListIcon />
          </button>
          <button
            onClick={() => setView("calendar")}
            title="Calendar view"
            className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-xl transition-colors duration-150 cursor-pointer mt-1 ${currentView === "calendar" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"}`}
          >
            <CalendarIcon />
          </button>
        </div>
      </div>

      {/* Theme toggle — always bottom-right */}
      <div className={`${PILL} bottom-6`}>
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={`${BTN} ${BTN_INACTIVE}`}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </>
  );
}
