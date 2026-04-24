import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/logout
 *
 * Clears the legacy session cookie (left over from before OAuth migration).
 * New sessions use Auth.js signout at /api/auth/signout — this is kept only
 * for backward compat so old cookies get cleaned up properly.
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("mtg-cal-session");
  return NextResponse.json({ ok: true });
}
