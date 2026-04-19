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
      <span className="text-sm text-gray-600 dark:text-gray-300 w-24 shrink-0">{label}</span>
      <code className="flex-1 bg-gray-100 dark:bg-white/5 text-xs px-3 py-2 rounded truncate text-gray-500 dark:text-gray-400">
        {url}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 px-3 py-2 text-xs font-medium rounded bg-blue-600 dark:bg-purple-600 text-white hover:bg-blue-700 dark:hover:bg-purple-700 transition min-w-[60px] cursor-pointer"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function SubscribeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#0c1220] rounded-xl shadow-2xl border border-gray-100 dark:border-white/8 w-full max-w-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white">Subscribe to Calendar</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none cursor-pointer">&times;</button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Copy a URL below and add it to Google Calendar (<strong className="text-gray-700 dark:text-gray-300">Other calendars + &rarr; From URL</strong>) or Apple Calendar (<strong className="text-gray-700 dark:text-gray-300">File &rarr; New Calendar Subscription</strong>). Your calendar will auto-update with new events.
        </p>

        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">All Events</p>
          <CopyRow label="All formats" path="/calendar" />
        </div>

        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">By Format</p>
          <div className="space-y-2">
            {FORMAT_FEEDS.map((f) => (
              <CopyRow key={f.slug} label={f.label} path={`/calendar/${f.slug}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
