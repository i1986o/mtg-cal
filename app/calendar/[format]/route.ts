import { getActiveEvents } from "@/lib/events";
import { generateIcsString } from "@/lib/ical";
import { config } from "@/lib/config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SLUG_TO_FORMAT: Record<string, string> = {
  commander: "Commander",
  modern: "Modern",
  standard: "Standard",
  pioneer: "Pioneer",
  legacy: "Legacy",
  pauper: "Pauper",
  draft: "Draft",
  sealed: "Sealed",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const { format: slug } = await params;
  const format = SLUG_TO_FORMAT[slug.toLowerCase()];

  if (!format) {
    return NextResponse.json({ error: "Unknown format" }, { status: 404 });
  }

  const events = getActiveEvents({ format });
  const city = config.location.city;
  const ics = generateIcsString(
    events,
    `MTG ${format} — ${city}`,
    `${format} events in ${city} area`
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mtg-${slug}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
