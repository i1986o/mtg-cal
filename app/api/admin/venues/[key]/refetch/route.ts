import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/session";
import { fetchVenueImage } from "@/lib/venue-image-fetcher";
import { getVenueDefault, listKnownVenues, venueKey } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { key } = await params;
  const venueName = decodeURIComponent(key);
  if (!venueName.trim()) {
    return NextResponse.json({ error: "Venue name is required" }, { status: 400 });
  }

  const existing = getVenueDefault(venueName);
  if (existing?.image_source === "manual") {
    return NextResponse.json(
      { error: "This venue has a manual upload. Remove it first to retry the auto-fetcher." },
      { status: 409 },
    );
  }

  const lookupKey = venueKey(venueName);
  const match = listKnownVenues().find((v) => venueKey(v.name) === lookupKey);
  if (!match) {
    return NextResponse.json({ error: "No events found for that venue" }, { status: 404 });
  }

  const outcome = await fetchVenueImage({
    name: match.name,
    address: match.address,
    store_url: match.store_url,
    latitude: match.latitude,
    longitude: match.longitude,
  });

  if (outcome.source === "none") {
    return NextResponse.json(
      { ok: false, source: "none", message: "No tier produced an image (og_scrape, places, street_view all failed)." },
      { status: 200 },
    );
  }

  const next = getVenueDefault(venueName);
  return NextResponse.json({ ok: true, source: outcome.source, default: next });
}
