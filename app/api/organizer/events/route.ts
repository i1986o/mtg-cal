import { getCurrentUser, hasOrganizerAccess } from "@/lib/session";
import { getEventsByOwner, createEvent } from "@/lib/events";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasOrganizerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getEventsByOwner(user.id));
}

export async function POST(request: Request) {
  if (!(await hasOrganizerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }

  // Prefixed organizer event IDs guarantee no collision with scraper fingerprints.
  const id = `org_${user.id}_${randomUUID()}`;
  const event = createEvent({
    ...body,
    id,
    source: `organizer:${user.id}`,
    source_type: "organizer",
    owner_id: user.id,
    status: "active",
  });
  return NextResponse.json({ ok: true, event });
}
