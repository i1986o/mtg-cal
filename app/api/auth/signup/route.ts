// Email + password registration. Creates a user, hashes the password,
// drops an Auth.js-compatible session cookie. Subsequent requests are
// authenticated through the same `auth()` reader as OAuth signins.

import { NextResponse } from "next/server";
import { isSecureRequest, rateLimitAttempt, setSessionCookie, signupWithPassword } from "@/lib/credentials-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Rate limit by IP. We don't have the user yet so email-based bucketing
  // would invite enumeration; IP-only is sufficient for signup.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimitAttempt(`signup:${ip}`)) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const result = await signupWithPassword(body.email, body.password, body.name ?? null);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  await setSessionCookie(result.sessionToken, result.expires, isSecureRequest(req));
  return NextResponse.json({ ok: true });
}
