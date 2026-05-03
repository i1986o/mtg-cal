// Email + password sign-in. Lives at /api/auth/credentials so Auth.js's
// own /api/auth/[...nextauth] routes (provider-agnostic helpers like
// /api/auth/csrf, /api/auth/signout) keep working untouched.
//
// On success: sets the Auth.js-compatible session cookie. On failure: a
// generic "Email or password is incorrect" message — same response shape
// for unknown email and wrong password, so attackers can't enumerate
// accounts via timing or response differences.

import { NextResponse } from "next/server";
import { isSecureRequest, rateLimitAttempt, setSessionCookie, signinWithPassword } from "@/lib/credentials-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Rate limit by IP+email so a single attacker can't burn through 1000s
  // of password attempts against one account, while a single user typo
  // doesn't lock out other users on the same network.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const lower = body.email.trim().toLowerCase();
  if (!rateLimitAttempt(`signin:${ip}:${lower}`)) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const result = await signinWithPassword(body.email, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 401 });
  }

  await setSessionCookie(result.sessionToken, result.expires, isSecureRequest(req));
  return NextResponse.json({ ok: true });
}
