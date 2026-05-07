"use client";
import { useEffect, useRef, useState } from "react";

export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracking reveal state in React (instead of mutating element.style
  // imperatively) is what makes this survive router.refresh(): the server
  // re-renders the tree, JSX re-applies whatever inline style we render,
  // and useEffect's dep array doesn't fire on prop-only changes. Once
  // revealed, we stop rendering opacity:0 and don't re-hide.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setRevealed(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -16px 0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [delay, revealed]);

  return (
    <div
      ref={ref}
      className={[className, revealed ? "anim-fade-in-up" : ""].filter(Boolean).join(" ")}
      style={revealed ? undefined : { opacity: 0 }}
    >
      {children}
    </div>
  );
}
