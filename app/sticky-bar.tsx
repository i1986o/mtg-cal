"use client";
import { useStickySentinel } from "@/lib/use-sticky-sentinel";

export default function StickyBar({ children }: { children: React.ReactNode }) {
  const { sentinelRef, isStuck } = useStickySentinel();

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-0" />
      <div
        className={`sticky top-0 z-10 py-3 mb-6 bg-white dark:bg-[#0c1220] transition-shadow duration-300 anim-fade-in ${isStuck ? "shadow-[0_8px_24px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.18)]" : ""}`}
        style={{ "--delay": "80ms", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", paddingLeft: "calc(50vw - 50%)", paddingRight: "calc(50vw - 50%)" } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
