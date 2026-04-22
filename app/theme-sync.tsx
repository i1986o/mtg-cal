"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    }
  }, [pathname]);

  return null;
}
