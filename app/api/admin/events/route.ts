import { hasAdminAccess } from "@/lib/session";
import { getAllEvents, createEvent } from "@/lib/events";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getAllEvents());
}

export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  if (!body.title || !body.date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }
  const id = body.id || `manual_${randomUUID()}`;
  const event = createEvent({
    ...body,
    id,
    source: body.source || "manual",
    source_type: "manual",
  });
  return NextResponse.json({ ok: true, event });
}
