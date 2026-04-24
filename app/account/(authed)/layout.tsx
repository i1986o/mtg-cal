import { requireRole } from "@/lib/session";

/**
 * Auth-only wrapper for /account/*. Intentionally has no chrome — each page
 * decides its own layout so that the signed-in feed can mirror the public
 * homepage, and sub-pages (saved, events, sources) can use a simpler focused
 * layout. Navigation between account sections lives in the top-right
 * AccountMenu.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["user", "organizer", "admin"]);
  return <>{children}</>;
}
