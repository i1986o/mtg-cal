"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialFormats: string[];
  initialRadius: number;
  initialDaysAhead: number;
  availableFormats: string[];
}

export default function PreferencesForm({ initialFormats, initialRadius, initialDaysAhead, availableFormats }: Props) {
  const router = useRouter();
  const [formats, setFormats] = useState<Set<string>>(new Set(initialFormats));
  const [radius, setRadius] = useState<number>(initialRadius);
  const [daysAhead, setDaysAhead] = useState<number>(initialDaysAhead);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggleFormat(f: string) {
    setFormats((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formats: Array.from(formats),
        radius_miles: radius,
        days_ahead: daysAhead,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't save preferences. Try again.");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Formats you care about
        </legend>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Leave all unchecked to see every format.
        </p>
        <div className="flex flex-wrap gap-2">
          {availableFormats.map((f) => {
            const on = formats.has(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFormat(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  on
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                {f}
              </button>
            );
          })}
          {availableFormats.length === 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">No formats available yet.</span>
          )}
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Distance: <span className="font-mono">{radius} mi</span>
        </label>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value, 10))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Look ahead: <span className="font-mono">{daysAhead} days</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {[3, 7, 14, 30, 60].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDaysAhead(n)}
              className={`text-xs px-3 py-1.5 rounded-md border transition ${
                daysAhead === n
                  ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save preferences"}
        </button>
        {savedAt && <span className="text-xs text-emerald-700 dark:text-emerald-400">Saved at {savedAt}</span>}
      </div>
    </form>
  );
}
