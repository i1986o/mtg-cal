import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/session";
import { fetchVenueImage } from "@/lib/venue-image-fetcher";
import { getVenueDefault, listKnownVenues, venueKey } from "@/lib/venues";
import { uploadFileExists } from "@/lib/upload-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venues = listKnownVenues();
  const results: Array<{ name: string; source: string; image_url: string | null }> = [];
  const counts = { og_scrape: 0, places: 0, street_view: 0, none: 0, skipped_manual: 0, skipped_live: 0 };

  for (const v of venues) {
    const existing = getVenueDefault(v.name);
    if (existing?.image_source === "manual") {
      counts.skipped_manual++;
      continue;
    }
    if (existing?.image_url && uploadFileExists(existing.image_url)) {
      counts.skipped_live++;
      continue;
    }
    const outcome = await fetchVenueImage({
      name: v.name,
      address: v.address,
      store_url: v.store_url,
      latitude: v.latitude,
      longitude: v.longitude,
    });
    counts[outcome.source]++;
    results.push({ name: v.name, source: outcome.source, image_url: outcome.imageUrl || null });
  }

  return NextResponse.json({ ok: true, attempted: results.length, counts, results });
}
