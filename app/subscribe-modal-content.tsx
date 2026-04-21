"use client";
import { useState } from "react";
import { FORMAT_EMOJI, FORMAT_BADGE, FORMAT_BADGE_DEFAULT, FORMAT_EMOJI_DEFAULT } from "@/lib/format-style";

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

function FormatBadge({ label }: { label: string }) {
  const badgeClass = FORMAT_BADGE[label] || FORMAT_BADGE_DEFAULT;
  const emoji = FORMAT_EMOJI[label] || FORMAT_EMOJI_DEFAULT;
  return (
    <span className={`w-28 shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${badgeClass}`}>
      <span>{emoji}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

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
      <FormatBadge label={label} />
      <code className="flex-1 bg-gray-100 dark:bg-white/5 text-xs px-3 py-2 rounded truncate text-gray-500 dark:text-gray-400">
        {url}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 px-3 py-2 text-xs font-medium rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-white/15 transition min-w-[60px] cursor-pointer"
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
