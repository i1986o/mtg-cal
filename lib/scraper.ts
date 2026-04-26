import { fetchAllSources, ScrapedEvent } from "@/scrapers";
import { upsertEvents, archiveOldEvents, setSetting } from "./events";
import { fetchVenueImage } from "./venue-image-fetcher";
import { getVenueDefault, venueKey } from "./venues";
import { geocodeFirstMatch } from "./geocode";
import { uploadFileExists } from "./upload-storage";

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

/** Re-geocode every event whose `coords_source` is anything other than
 *  `"source"` and that has an address. Mutates the events in place. Failures
 *  leave the original (suspect) coords alone — better than nothing. Runs
 *  serially with a tiny delay to be a polite Nominatim/Mapbox citizen. */
const COORD_RECONCILE_DELAY_MS = 200;

async function reconcileEventCoords(events: ScrapedEvent[]): Promise<void> {
  const targets = events.filter(
    (ev) => ev.coords_source && ev.coords_source !== "source" && Boolean(ev.address),
  );
  if (targets.length === 0) return;
  console.log(`[geocode] reconciling ${targets.length} event(s) with untrusted coords`);

  for (const ev of targets) {
    // Try address alone first (cleaner for Nominatim, which trips on
    // duplicated tokens like "Hamiltons Hand 226 Walnut, 226 Walnut St…"),
    // then fall back to the richer "name, address" combo for sources where
    // the address alone is too vague (e.g. TopDeck's "city, state").
    const candidates = [ev.address, ev.location ? `${ev.location}, ${ev.address}` : null];
    try {
      const hit = await geocodeFirstMatch(candidates);
      if (hit) {
        const before = ev.latitude != null && ev.longitude != null
          ? `${ev.latitude.toFixed(4)},${ev.longitude.toFixed(4)}`
          : "null";
        ev.latitude = hit.latitude;
        ev.longitude = hit.longitude;
        // Promote to "source"-grade trust now that the lat/lng matches the
        // address — downstream consumers (and re-runs) treat it as authoritative.
        ev.coords_source = "source";
        console.log(
          `[geocode] ✓ ${ev.id} (${before} → ${hit.latitude.toFixed(4)},${hit.longitude.toFixed(4)} via ${hit.provider})`,
        );
      } else {
        console.log(`[geocode] · ${ev.id} no match for "${ev.address}"; keeping fallback coords`);
      }
    } catch (err) {
      console.warn(`[geocode] unexpected error for ${ev.id}:`, err);
    }
    await new Promise((r) => setTimeout(r, COORD_RECONCILE_DELAY_MS));
  }
}

/** How long to wait between auto-fetch attempts before re-trying a venue we
 *  already failed on. Prevents the scraper from re-hammering Google's APIs on
 *  every run for venues that simply don't have a photo available. */
const VENUE_FETCH_RETRY_DAYS = 30;
const VENUE_FETCH_MAX_ATTEMPTS = 3;
const VENUE_FETCH_DELAY_MS = 250;

function shouldSkipVenueFetch(name: string): boolean {
  const existing = getVenueDefault(name);
  if (!existing) return false;
  if (existing.image_source === "manual") return true;
  // Self-heal: a non-empty image_url whose underlying file is missing (e.g.
  // Railway volume reset, file manually deleted) should NOT short-circuit a
  // re-fetch. Without this, prior runs' broken URLs stick forever.
  if (existing.image_url && uploadFileExists(existing.image_url)) return true;
  // Empty image_url (or missing file) = previous attempts failed or the file
  // is gone. Back off if recent + at cap.
  if ((existing.attempt_count ?? 0) < VENUE_FETCH_MAX_ATTEMPTS) return false;
  if (!existing.last_fetched_at) return false;
  const ageMs = Date.now() - new Date(existing.last_fetched_at).getTime();
  return ageMs < VENUE_FETCH_RETRY_DAYS * 24 * 60 * 60 * 1000;
}

async function enqueueVenueImageFetches(events: ScrapedEvent[]): Promise<void> {
  // Reduce events down to one record per venue, preferring rows with the most
  // info (store_url, coords, address). Skip venues we already have an image
  // for, manual overrides, and recently-failed attempts.
  const byKey = new Map<string, ScrapedEvent>();
  for (const ev of events) {
    if (!ev.location) continue;
    const key = venueKey(ev.location);
    if (!key || shouldSkipVenueFetch(ev.location)) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, ev);
      continue;
    }
    // Prefer the row with the richest metadata.
    const score = (e: ScrapedEvent) =>
      (e.store_url ? 4 : 0) +
      (e.detail_url ? 2 : 0) +
      (e.latitude != null && e.longitude != null ? 1 : 0);
    if (score(ev) > score(existing)) byKey.set(key, ev);
  }

  if (byKey.size === 0) return;
  console.log(`[venue-image] attempting auto-fetch for ${byKey.size} venue(s)`);

  for (const ev of byKey.values()) {
    try {
      const outcome = await fetchVenueImage({
        name: ev.location,
        address: ev.address,
        store_url: ev.store_url,
        detail_url: ev.detail_url,
        latitude: ev.latitude,
        longitude: ev.longitude,
      });
      if (outcome.source !== "none") {
        console.log(`[venue-image] ✓ ${ev.location} via ${outcome.source}`);
      } else {
        console.log(`[venue-image] · ${ev.location}: no source produced an image`);
      }
    } catch (err) {
      // Defensive: fetchVenueImage already swallows internal errors, so this
      // would only fire on a programming bug. Log and continue.
      console.warn(`[venue-image] unexpected error for "${ev.location}":`, err);
    }
    // Small inter-request gap so we don't burst external APIs.
    await new Promise((r) => setTimeout(r, VENUE_FETCH_DELAY_MS));
  }
}

function dedupeAcrossSources(events: ScrapedEvent[]): ScrapedEvent[] {
  // Pass 1: dedupe by id
  const seenIds = new Set<string>();
  const byId = events.filter((e) => {
    if (seenIds.has(e.id)) return false;
    seenIds.add(e.id);
    return true;
  });

  // Pass 2: dedupe by fingerprint (cross-source)
  const seen = new Map<string, ScrapedEvent>();
  const result: ScrapedEvent[] = [];

  for (const e of byId) {
    const fp = normalize(e.title) + "|" + e.date + "|" + normalize(e.location);
    if (seen.has(fp)) {
      const existing = seen.get(fp)!;
      console.log(`[dedupe] cross-source duplicate: "${e.title}" (${e.source}) matches "${existing.title}" (${existing.source}) — keeping ${existing.source}`);
      continue;
    }
    seen.set(fp, e);
    result.push(e);
  }

  return result;
}

export async function runScraper(): Promise<{
  scraped: number;
  deduped: number;
  added: number;
  updated: number;
  skipped: number;
  archived: number;
}> {
  console.log("🃏 MTG Calendar — Scraper Run");
  console.log(`   ${new Date().toISOString()}`);

  // 1. Fetch from all sources
  const scraped = await fetchAllSources();
  console.log(`[sources] Total scraped: ${scraped.length}`);

  // 2. Dedupe
  const deduped = dedupeAcrossSources(scraped);
  console.log(`[dedupe] After dedup: ${deduped.length}`);

  // 2a. Reconcile untrusted coords against the address. Sources that don't
  // expose per-event lat/lng (today: Discord falling back to GUILD_COORDS)
  // get re-geocoded from their address, so the stored coords actually point
  // at the venue rather than at a guild-wide default.
  await reconcileEventCoords(deduped);

  // 3. Upsert into database
  const result = upsertEvents(deduped);
  console.log(`[db] +${result.added} new | ~${result.updated} updated | ${result.skipped} pinned`);

  // 3a. Best-effort: try to grab a real photo for any newly-seen venue. This
  // never throws out of the scraper — if it fails, render-time falls back to
  // an inline Mapbox map (see lib/event-image.ts).
  await enqueueVenueImageFetches(deduped);

  // 4. Archive old events
  const archived = archiveOldEvents(90);
  if (archived > 0) console.log(`[db] Archived ${archived} old events`);

  // 5. Update last scrape timestamp
  const now = new Date().toISOString();
  setSetting("last_scrape", now);
  setSetting("last_scrape_result", JSON.stringify({
    scraped: scraped.length,
    deduped: deduped.length,
    ...result,
    archived,
    timestamp: now,
  }));

  return {
    scraped: scraped.length,
    deduped: deduped.length,
    ...result,
    archived,
  };
}
