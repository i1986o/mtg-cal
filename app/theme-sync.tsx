"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Persist the resolved theme to a cookie so the server can SSR with the
 *  correct `dark` class on the next request, eliminating the flash. */
function setThemeCookie(value: "dark" | "light") {
  document.cookie = `theme=${value}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
}

export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    const shouldBeDark =
      saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (shouldBeDark) {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
      setThemeCookie("dark");
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
      setThemeCookie("light");
    }
  }, [pathname]);

  return null;
}
