import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEventsByOwner, createEvent } from "@/lib/events";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getEventsByOwner(user.id));
}

export async function POST(request: Request) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }

  const publishesImmediately = user.role === "organizer" || user.role === "admin";
  const idPrefix = publishesImmediately ? "org" : "user";
  const id = `${idPrefix}_${user.id}_${randomUUID()}`;
  const sourceTypeForRole = publishesImmediately ? "organizer" : "user";

  const event = createEvent({
    ...body,
    id,
    source: `${sourceTypeForRole}:${user.id}`,
    source_type: sourceTypeForRole,
    owner_id: user.id,
    status: publishesImmediately ? "active" : "pending",
  });
  return NextResponse.json({ ok: true, event });
}
