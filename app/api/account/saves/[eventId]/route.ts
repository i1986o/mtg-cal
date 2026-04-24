import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { saveEvent, unsaveEvent } from "@/lib/event-saves";
import { getEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

async function auth() {
  if (!(await hasAccountAccess())) return null;
  return await getCurrentUser();
}

export async function PUT(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  // Only allow saving events that actually exist and are publicly visible.
  const ev = getEvent(eventId);
  if (!ev || !(ev.status === "active" || ev.status === "pinned")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  saveEvent(user.id, eventId);
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  unsaveEvent(user.id, eventId);
  return NextResponse.json({ ok: true, saved: false });
}
