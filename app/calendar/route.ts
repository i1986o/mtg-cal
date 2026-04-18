import { getActiveEvents } from "@/lib/events";
import { generateIcsString } from "@/lib/ical";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = getActiveEvents();
  const ics = generateIcsString(events);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mtg-events.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
