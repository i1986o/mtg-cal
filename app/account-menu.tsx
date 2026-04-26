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
    <div ref={wrapperRef} className="fixed bottom-6 left-4 z-40 flex bg-white dark:bg-[#1a2438] rounded-xl p-0.5 border border-gray-200 dark:border-white/15 shadow-xl shadow-black/15 dark:shadow-black/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={displayName}
        aria-label={`Account menu for ${displayName}`}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 bottom-full mb-2 w-56 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1828] shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden"
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
