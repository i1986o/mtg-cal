"use client";
import { useState, useEffect, useRef } from "react";

export default function StickyBar({ children }: { children: React.ReactNode }) {
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-0" />
      <div
        className={`sticky top-0 z-10 py-3 mb-6 bg-white dark:bg-[#0e2240] transition-shadow duration-200 ${isStuck ? "shadow-md dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]" : ""}`}
        style={{ marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", paddingLeft: "calc(50vw - 50%)", paddingRight: "calc(50vw - 50%)" }}
      >
        {children}
      </div>
    </>
  );
}
