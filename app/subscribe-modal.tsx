"use client";
import { useState } from "react";

const FORMAT_FEEDS = [
  { slug: "commander", label: "Commander" },
  { slug: "modern", label: "Modern" },
  { slug: "standard", label: "Standard" },
  { slug: "draft", label: "Draft" },
  { slug: "sealed", label: "Sealed" },
  { slug: "pioneer", label: "Pioneer" },
  { slug: "legacy", label: "Legacy" },
  { slug: "pauper", label: "Pauper" },
];

function CopyRow({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin + path : path;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700 dark:text-gray-300 w-24 shrink-0">{label}</span>
      <code className="flex-1 bg-gray-100 dark:bg-gray-800 text-xs px-3 py-2 rounded truncate text-gray-600 dark:text-gray-400">
        {url}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 px-3 py-2 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition min-w-[60px]"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function SubscribeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-gray-300 text-sm font-medium rounded-lg border border-white/15 hover:bg-white/15 hover:text-white transition cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Subscribe to Calendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Subscribe to Calendar</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none cursor-pointer">&times;</button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Copy a URL below and add it to Google Calendar (<strong>Other calendars + &rarr; From URL</strong>) or Apple Calendar (<strong>File &rarr; New Calendar Subscription</strong>). Your calendar will auto-update with new events.
            </p>

            {/* All events */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">All Events</p>
              <CopyRow label="All formats" path="/calendar" />
            </div>

            {/* Per-format */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">By Format</p>
              <div className="space-y-2">
                {FORMAT_FEEDS.map((f) => (
                  <CopyRow key={f.slug} label={f.label} path={`/calendar/${f.slug}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
