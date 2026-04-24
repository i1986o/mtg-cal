"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AccountMenu({
  displayName,
  role,
}: {
  displayName: string;
  role: "admin" | "organizer" | "user";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    const csrf = await fetch("/api/auth/csrf").then((r) => r.json());
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "/" }).toString(),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={wrapperRef} className="fixed top-4 right-4 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#1a2438]/90 backdrop-blur-sm border border-gray-200 dark:border-white/15 shadow-sm hover:shadow-md text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">{displayName}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1828] shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10">
            <div className="text-xs text-gray-500 dark:text-gray-400">Signed in as</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</div>
            <div className="text-[10px] uppercase tracking-wide mt-0.5 text-gray-400 dark:text-gray-500">{role}</div>
          </div>

          <MenuGroup>
            <MenuLink href="/account/saved" onSelect={() => setOpen(false)}>Saved events</MenuLink>
            <MenuLink href="/account/events" onSelect={() => setOpen(false)}>My events</MenuLink>
            <MenuLink href="/account/events/new" onSelect={() => setOpen(false)}>+ Submit event</MenuLink>
            <MenuLink href="/account/sources" onSelect={() => setOpen(false)}>Event sources</MenuLink>
          </MenuGroup>

          {role === "admin" && (
            <MenuGroup>
              <MenuLink href="/admin" onSelect={() => setOpen(false)} muted>
                → Admin portal
              </MenuLink>
            </MenuGroup>
          )}

          <MenuGroup last>
            <button
              type="button"
              onClick={logout}
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              Log out
            </button>
          </MenuGroup>
        </div>
      )}
    </div>
  );
}

function MenuGroup({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "" : "border-b border-gray-100 dark:border-white/10"}>{children}</div>
  );
}

function MenuLink({
  href,
  children,
  onSelect,
  muted = false,
}: {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className={`block px-3 py-2 text-sm transition ${
        muted
          ? "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  );
}
