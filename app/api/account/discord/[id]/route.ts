// Web manager mutation routes for Discord subscriptions. Auth: only the
// PlayIRL user whose linked Discord OAuth identity created the sub (or whose
// `linked_user_id` is set on it) can edit/delete via this surface.
//
// Slash-command edits go through /api/discord/interactions instead and use
// MANAGE_GUILD as their auth model — both surfaces hit the same DB.

import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import {
  type DiscordSubMode,
  deleteSubscription,
  getSubscription,
  setSubscriptionEnabled,
  updateSubscription,
  userCanManageSubscription,
} from "@/lib/discord-subscriptions";

export const dynamic = "force-dynamic";

const VALID_MODES: DiscordSubMode[] = ["weekly", "daily", "reminder"];

interface PatchBody {
  format?: string | null;
  source?: string | null;
  radius_miles?: number | null;
  near_label?: string;
  hour_utc?: number;
  dow?: number | null;
  days_ahead?: number;
  lead_minutes?: number;
  mode?: DiscordSubMode;
  enabled?: boolean;
}

async function authorize(id: string): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  if (!(await hasAccountAccess())) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const sub = getSubscription(id);
  if (!sub) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (!userCanManageSubscription(user.id, id)) {
    // Hide existence — don't differentiate "exists, you can't touch it"
    // from "doesn't exist".
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true, userId: user.id };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth.ok) return auth.response;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  // enabled toggle is mutually exclusive with field edits — keep them
  // simple/composable so the client can hit either independently.
  if (typeof body.enabled === "boolean" && Object.keys(body).length === 1) {
    setSubscriptionEnabled(id, body.enabled);
    return NextResponse.json({ ok: true });
  }

  if (body.mode !== undefined && !VALID_MODES.includes(body.mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  if (body.hour_utc !== undefined && (body.hour_utc < 0 || body.hour_utc > 23)) {
    return NextResponse.json({ error: "hour_utc out of range" }, { status: 400 });
  }
  if (body.dow !== undefined && body.dow !== null && (body.dow < 0 || body.dow > 6)) {
    return NextResponse.json({ error: "dow out of range" }, { status: 400 });
  }
  if (body.days_ahead !== undefined && (body.days_ahead < 1 || body.days_ahead > 60)) {
    return NextResponse.json({ error: "days_ahead out of range" }, { status: 400 });
  }
  if (body.lead_minutes !== undefined && (body.lead_minutes < 0 || body.lead_minutes > 60 * 24 * 7)) {
    return NextResponse.json({ error: "lead_minutes out of range" }, { status: 400 });
  }
  if (body.radius_miles !== undefined && body.radius_miles !== null && (body.radius_miles < 1 || body.radius_miles > 500)) {
    return NextResponse.json({ error: "radius_miles out of range" }, { status: 400 });
  }

  const updated = updateSubscription(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, subscription: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth.ok) return auth.response;
  deleteSubscription(id);
  return NextResponse.json({ ok: true });
}
