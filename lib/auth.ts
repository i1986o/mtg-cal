import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const SESSION_COOKIE = "mtg-cal-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    // Dev-only fallback: accept "admin" if no hash is set. Refuse in prod.
    if (process.env.NODE_ENV === "production") return false;
    return password === "admin";
  }
  return bcrypt.compare(password, hash);
}

export function createSessionToken(): string {
  const payload = Date.now().toString();
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionToken(token: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  if (sig !== expected) return false;
  // Check expiry
  const created = parseInt(payload, 10);
  return Date.now() - created < SESSION_MAX_AGE * 1000;
}

export async function setSessionCookie(): Promise<void> {
  const token = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

// Hash a password (utility for generating ADMIN_PASSWORD_HASH)
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
