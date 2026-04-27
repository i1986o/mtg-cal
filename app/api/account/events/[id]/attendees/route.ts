import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEvent } from "@/lib/events";
import { getAttendees } from "@/lib/event-rsvps";

export const dynamic = "force-dynamic";

/**
 * Host-only attendee roster. Same ownership-check pattern as
 * `app/api/account/events/[id]/route.ts:5` — admins bypass.
 *
 * Returns names + emails so the host can build a check-in sheet. We
 * deliberately don't expose this on the public event-detail page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "admin" && event.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    eventId: id,
    capacity: event.capacity,
    attendees: getAttendees(id),
  });
}
