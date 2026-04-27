import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEvent } from "@/lib/events";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Host-cancel an event. Sets `cancelled_at` to NOW and flips every RSVP to
 * 'cancelled' in the same transaction. Soft-delete (the row stays in the DB
 * so attendees can still load the event detail and see the cancelled banner).
 *
 * Auth: only the owner — or any admin — can cancel. Same shape as the
 * per-event PATCH/DELETE endpoint.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (event.cancelled_at) {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE events SET cancelled_at = datetime('now') WHERE id = ?").run(id);
    // Mark all RSVPs cancelled so attendees see consistent state.
    db.prepare(
      "UPDATE event_rsvps SET status = 'cancelled', updated_at = datetime('now') WHERE event_id = ? AND status != 'cancelled'",
    ).run(id);
  });
  tx();

  return NextResponse.json({ ok: true });
}
