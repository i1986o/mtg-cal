// Single-event .ics download. The "Add to my calendar" button on
// /event/[id] points at this URL — the user gets a one-VEVENT calendar
// they can drop into Google Calendar / Apple Calendar / Outlook.
//
// Distinct from /calendar (the subscribable feed) — this is a one-shot
// snapshot, no REFRESH-INTERVAL header, no future updates pull through.
// That matches user mental model: "Add to calendar" = a single calendar
// entry, not a subscription that mutates.
//
// Visibility-aware: unlisted/private/skip events 404 here, same chokepoint
// as the /event/[id] page itself, so a leaked URL doesn't expose private
// event metadata via the calendar feed.

import { NextResponse } from "next/server";
import { getEvent } from "@/lib/events";
import { generateIcsString } from "@/lib/ical";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = getEvent(decodeURIComponent(id));

  // 404 the same set the public event page hides: skip, pending, or
  // non-public visibility. Cancelled events are still downloadable —
  // calendars surfacing the cancellation is useful, not a leak.
  if (
    !ev ||
    ev.status === "skip" ||
    ev.status === "pending" ||
    ev.visibility !== "public"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const titlePrefix = ev.cancelled_at ? "[Cancelled] " : "";
  const calName = `${titlePrefix}${ev.title}`;
  const calDesc = `Single event from PlayIRL.GG · ${ev.format || "MTG"} · ${ev.date}`;

  const ics = generateIcsString([ev], calName, calDesc);

  // Filename derived from the event id; safe characters only.
  const safeId = ev.id.replace(/[^a-z0-9_-]/gi, "_");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mtg-event-${safeId}.ics"`,
      // Single-event ICS files are immutable for a given event id —
      // calendar clients fetch once, import, done. Cache for an hour to
      // dampen the impact of repeated "Add to calendar" clicks.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
