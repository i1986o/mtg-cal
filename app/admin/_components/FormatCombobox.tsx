"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Plain-string combobox for the Format field. Shows the full suggestion list
 * on focus (no typing required) and filters as the user types. Picking an
 * item fills the input; free-text is always allowed so one-off formats work.
 *
 * Uses the same visual pattern as VenueAutocomplete so the two fields feel
 * consistent — and avoids the native `<datalist>` which browsers render with
 * inconsistent fonts/alignment, often drawn off-screen.
 */
export default function FormatCombobox({
  value,
  onChange,
  options,
  className,
  placeholder,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [focused]);

  const q = value.trim().toLowerCase();
  const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : [...options];
  const exact = matches.length === 1 && matches[0].toLowerCase() === q;
  const showDropdown = focused && matches.length > 0 && !exact;

  function pick(next: string) {
    onChange(next);
    setFocused(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(0);
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (!showDropdown) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[highlight]);
          } else if (e.key === "Escape") {
            setFocused(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          {matches.map((opt, i) => (
            <li key={opt} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} /* keep focus on input */
                onClick={() => pick(opt)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 transition ${
                  i === highlight ? "bg-gray-100 dark:bg-stone-800" : "hover:bg-gray-50 dark:hover:bg-stone-800/70"
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
