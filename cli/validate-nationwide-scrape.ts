// One-shot validator for the multi-region WotC scraper. Runs against a
// small 3-anchor grid (Philly + NYC + LA) instead of the full CONUS sweep
// so it completes in ~3 min cold instead of ~55 min, while still
// exercising the full code path: multi-region store query + dedup,
// geocode cache hits/misses, multi-region event query + dedup, and
// curation classification.
//
// This script does NOT touch the real `events` table — it imports the
// scraper directly and discards the output, so re-running it is safe and
// idempotent. The geocode cache *is* populated, which is the desired
// side-effect (warms the cache for future production scrapes).

import { updateConfig, getConfig } from "@/lib/runtime-config";
import fetchWizardsEvents from "@/scrapers/wizards-locator";

const VALIDATION_GRID = [
  { label: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, radiusMi: 25 },
  { label: "New York, NY", lat: 40.7128, lng: -74.0060, radiusMi: 25 },
  { label: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, radiusMi: 25 },
];

(async () => {
  const before = getConfig();
  console.log(`[validate] saved scope=${before.scrapeScope} regions=${before.scrapeRegions.length}`);

  // Override to validation grid + national scope. Restore on exit.
  updateConfig({ scrapeScope: "national", scrapeRegions: VALIDATION_GRID });

  const startedAt = Date.now();
  let events: any[] = [];
  let err: any = null;
  try {
    events = await fetchWizardsEvents();
  } catch (e) {
    err = e;
  }
  const ms = Date.now() - startedAt;

  // Restore the original config so we don't leave the validation grid
  // persisted as production state.
  updateConfig({
    scrapeScope: before.scrapeScope,
    scrapeRegions: before.scrapeRegions,
  });

  if (err) {
    console.error(`[validate] FAILED in ${ms}ms:`, err.message ?? err);
    process.exit(1);
  }

  // Summarize per-region distribution by haversine'ing each event back to
  // its nearest validation anchor — quick sanity check that we got events
  // from each metro.
  const byMetro: Record<string, number> = {};
  for (const ev of events) {
    let nearest = "?";
    let bestD = Infinity;
    for (const r of VALIDATION_GRID) {
      const dLat = (r.lat - (ev.latitude ?? 0)) * Math.PI / 180;
      const dLng = (r.lng - (ev.longitude ?? 0)) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((ev.latitude ?? 0) * Math.PI / 180) * Math.cos(r.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const d = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (d < bestD) { bestD = d; nearest = r.label; }
    }
    byMetro[nearest] = (byMetro[nearest] ?? 0) + 1;
  }

  console.log(`\n[validate] ✓ scrape completed in ${(ms / 1000).toFixed(1)}s`);
  console.log(`[validate] ${events.length} events across ${VALIDATION_GRID.length} metros:`);
  for (const m of VALIDATION_GRID) {
    console.log(`  ${m.label}: ${byMetro[m.label] ?? 0} events`);
  }
  process.exit(0);
})();
