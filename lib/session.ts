import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAuthenticated as isLegacyAuthenticated } from "./auth";

export type Role = "admin" | "organizer" | "user";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  suspended: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
    suspended: session.user.suspended,
  };
}

/**
 * Returns true if the current request has admin access via either:
 *  - The legacy HMAC password cookie (break-glass admin), OR
 *  - An Auth.js session whose user.role === "admin".
 *
 * Use this in /api/admin/* handlers to keep them backward compatible.
 */
export async function hasAdminAccess(): Promise<boolean> {
  if (await isLegacyAuthenticated()) return true;
  const user = await getCurrentUser();
  return user?.role === "admin" && !user.suspended;
}

export async function hasOrganizerAccess(): Promise<boolean> {
  if (await isLegacyAuthenticated()) return true;
  const user = await getCurrentUser();
  return !!user && !user.suspended && (user.role === "organizer" || user.role === "admin");
}

/**
 * Server Component / route handler guard. Redirects to login when the user
 * lacks the required role. Pass a single role or an array.
 */
export async function requireRole(role: Role | Role[]): Promise<CurrentUser> {
  const allowed = Array.isArray(role) ? role : [role];
  const needsAdmin = allowed.includes("admin") && allowed.length === 1;
  const loginPath = needsAdmin ? "/admin/login" : "/organizer/login";

  // Legacy admin cookie satisfies any required role (it's the break-glass path).
  if (await isLegacyAuthenticated()) {
    return { id: "__legacy_admin__", email: "", name: "Admin", image: null, role: "admin", suspended: false };
  }
  const user = await getCurrentUser();
  if (!user || user.suspended || !allowed.includes(user.role)) {
    redirect(loginPath);
  }
  return user;
}
