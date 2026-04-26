"use client";
import { useEffect, useRef } from "react";
import { useStickySentinel } from "@/lib/use-sticky-sentinel";

export default function StickyBar({ children }: { children: React.ReactNode }) {
  const { sentinelRef, isStuck } = useStickySentinel();
  const barRef = useRef<HTMLDivElement>(null);

  // Publish the bar's actual rendered height as a CSS variable so children
  // that sit just below it (day-card heading, calendar-view weekday header)
  // can use `top-[var(--sticky-bar-h)]` and stay flush with the bar across
  // viewports — the chip bar wraps to a second line under sm, so a static
  // offset would either gap on desktop or clip on mobile.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty("--sticky-bar-h", `${el.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-0" />
      <div
        ref={barRef}
        className={`sticky top-0 z-10 py-3 mb-6 bg-white dark:bg-[#0c1220] transition-shadow duration-300 anim-fade-in ${isStuck ? "shadow-[0_8px_24px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.18)]" : ""}`}
        style={{ "--delay": "80ms", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", paddingLeft: "calc(50vw - 50%)", paddingRight: "calc(50vw - 50%)" } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
