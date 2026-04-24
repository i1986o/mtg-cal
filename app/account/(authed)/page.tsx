import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";

/**
 * /account is auth-gated but visually identical to the public homepage — the
 * signed-in user's feed lives at `/`, with their persisted filter prefs applied
 * automatically. This route exists so post-login redirects and menu links keep
 * a canonical "home" URL that always requires auth.
 */
export default async function AccountLanding() {
  await requireRole(["user", "organizer", "admin"]);
  redirect("/");
}
