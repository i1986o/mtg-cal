import { redirect } from "next/navigation";
import { auth } from "@/auth";

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

/** Returns true if the current request has an active admin Auth.js session. */
export async function hasAdminAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin" && !user.suspended;
}

export async function hasOrganizerAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && !user.suspended && (user.role === "organizer" || user.role === "admin");
}

/** Any signed-in, non-suspended user (including base `user` role). */
export async function hasAccountAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && !user.suspended;
}

/**
 * Server Component / route handler guard. Redirects to login when the user
 * lacks the required role. Pass a single role or an array.
 */
export async function requireRole(role: Role | Role[]): Promise<CurrentUser> {
  const allowed = Array.isArray(role) ? role : [role];
  const needsAdmin = allowed.includes("admin") && allowed.length === 1;
  const loginPath = needsAdmin ? "/admin/login" : "/account/login";

  const user = await getCurrentUser();
  if (!user || user.suspended || !allowed.includes(user.role)) {
    redirect(loginPath);
  }
  return user;
}
