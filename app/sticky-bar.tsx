"use client";
import { useState, useEffect, useRef } from "react";

export default function StickyBar({ children }: { children: React.ReactNode }) {
  const [isStuck, setIsStuck] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: "-1px 0px 0px 0px" }
    );

    // Observe a sentinel element just above the sticky bar
    const sentinel = document.createElement("div");
    sentinel.style.height = "1px";
    sentinel.style.width = "1px";
    sentinel.style.position = "absolute";
    sentinel.style.top = "-1px";
    el.style.position = "relative";
    el.prepend(sentinel);
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`sticky top-0 z-10 py-3 mb-6 bg-white dark:bg-[#0e2240] transition-shadow duration-200 ${isStuck ? "shadow-md dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]" : ""}`}
      style={{ marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", paddingLeft: "calc(50vw - 50%)", paddingRight: "calc(50vw - 50%)" }}
    >
      {children}
    </div>
  );
}
