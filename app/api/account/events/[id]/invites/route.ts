import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEvent } from "@/lib/events";
import { createInvite, listInvites } from "@/lib/event-invites";

export const dynamic = "force-dynamic";

async function ensureOwner(id: string) {
  if (!(await hasAccountAccess())) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;
  const event = getEvent(id);
  if (!event) return { error: "Not found", status: 404 } as const;
  if (user.role !== "admin" && event.owner_id !== user.id) {
    return { error: "Not found", status: 404 } as const;
  }
  return { user, event } as const;
}

/** GET — list invites for the event. Host-only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ensureOwner(id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ invites: listInvites(id) });
}

/** POST — generate a new invite token. Body: { label?: string }. Returns the row. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ensureOwner(id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  let body: { label?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty/invalid body is fine — just use no label.
  }
  const label = (body.label ?? "").slice(0, 80);
  const invite = createInvite({ eventId: id, createdBy: r.user.id, label });
  return NextResponse.json({ ok: true, invite });
}
