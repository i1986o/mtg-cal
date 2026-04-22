"use client";
import { useEffect, useRef, useState } from "react";

export function useStickySentinel(rootMargin = "0px") {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { sentinelRef, isStuck };
}
