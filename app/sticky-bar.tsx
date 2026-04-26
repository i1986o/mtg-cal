"use client";
import { useStickySentinel } from "@/lib/use-sticky-sentinel";

/**
 * Top-of-page header + filter bar with a "float on scroll" pattern.
 *
 * - The page-hero block (`header` prop) — title + subtitle — collapses and
 *   fades out as soon as the user scrolls past it, for a more minimal vibe.
 * - The filter chips (`children`) live inside a floating pill that sticks
 *   to the top of the viewport. Pill hugs its content (so it's only as
 *   wide as the chip-bar text), centered horizontally, with a soft shadow
 *   that deepens once the pill is stuck.
 *
 * Both the header collapse and the pill's stuck shadow react to a single
 * `isStuck` boolean derived from a zero-height IntersectionObserver
 * sentinel placed just above the pill — same primitive used by DayCard.
 */
export default function StickyBar({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const { sentinelRef, isStuck } = useStickySentinel();

  return (
    <>
      {/* Collapsible page hero — fades out + collapses to zero height when
          the pill below sticks. Pointer-events disabled in the collapsed
          state so the hidden links can't be tab-focused. */}
      <div
        className={`transition-all duration-300 ease-out origin-top overflow-hidden ${
          isStuck
            ? "opacity-0 max-h-0 -translate-y-2 pointer-events-none"
            : "opacity-100 max-h-64 mb-6"
        }`}
      >
        {header}
      </div>

      {/* Sentinel: the pill becomes "stuck" once this scrolls out of view. */}
      <div ref={sentinelRef} className="h-0 w-0" />

      {/* Floating pill, sticky on scroll. */}
      <div className="sticky top-2 z-10 flex justify-center mb-6 anim-fade-in" style={{ "--delay": "80ms" } as React.CSSProperties}>
        <div
          className={`inline-flex bg-white dark:bg-[#0c1220] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2 transition-shadow duration-300 ${
            isStuck
              ? "shadow-lg shadow-black/10 dark:shadow-black/40"
              : "shadow-sm shadow-black/5 dark:shadow-black/20"
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
