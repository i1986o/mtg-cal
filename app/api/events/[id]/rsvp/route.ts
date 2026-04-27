import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEvent } from "@/lib/events";
import { getRsvpSummary, setRsvp, isPastEvent, type RsvpStatus } from "@/lib/event-rsvps";

export const dynamic = "force-dynamic";

const ALLOWED_INPUT: ReadonlySet<RsvpStatus> = new Set([
  "going",
  "maybe",
  "waitlist",
  "cancelled",
] as const);

/** GET — public-ish read. Returns active counts; the caller's RSVP status
 *  comes back only when they're signed in. Hidden / pending / skip events
 *  return 404 so we don't leak moderator state. Visibility (Tier 1) is
 *  handled at the page level — this endpoint just answers the count
 *  question for any active row. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event || (event.status !== "active" && event.status !== "pinned")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = (await hasAccountAccess()) ? await getCurrentUser() : null;
  const summary = getRsvpSummary(id, user?.id ?? null);
  return NextResponse.json({
    rsvpEnabled: event.rsvp_enabled === 1,
    capacity: event.capacity,
    pastEvent: isPastEvent(event.date),
    cancelledAt: event.cancelled_at,
    ...summary,
  });
}

/** POST — set the current user's RSVP. Body: { status: 'going'|'maybe'|'waitlist'|'cancelled' }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Sign in to RSVP" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to RSVP" }, { status: 401 });

  const { id } = await params;
  const event = getEvent(id);
  if (!event || (event.status !== "active" && event.status !== "pinned")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (event.rsvp_enabled !== 1) {
    return NextResponse.json({ error: "RSVPs are disabled for this event" }, { status: 400 });
  }
  if (event.cancelled_at) {
    return NextResponse.json({ error: "This event was cancelled" }, { status: 400 });
  }
  if (isPastEvent(event.date)) {
    return NextResponse.json({ error: "This event has already happened" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const next = body.status as RsvpStatus | undefined;
  if (!next || !ALLOWED_INPUT.has(next)) {
    return NextResponse.json(
      { error: "status must be 'going', 'maybe', 'waitlist', or 'cancelled'" },
      { status: 400 },
    );
  }

  const result = setRsvp(user.id, id, next);
  if (!result.ok) {
    if (result.reason === "full") {
      return NextResponse.json(
        { error: "This event is full", reason: "full", counts: result.counts },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "RSVP rejected", reason: result.reason, counts: result.counts },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    status: result.status,
    counts: result.counts,
    waitlistPosition: result.waitlistPosition,
    promoted: result.promoted,
  });
}
