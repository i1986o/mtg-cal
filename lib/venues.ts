import { getDb } from "./db";

/**
 * A de-duplicated view of every venue the site already knows about — built
 * from past events (both scraped and submitted) plus user-linked Discord
 * sources. We expose this to the event form so returning users don't have
 * to re-type the same venue name / address / website every time.
 */

export interface VenueSuggestion {
  name: string;
  address: string;
  store_url: string;
  latitude: number | null;
  longitude: number | null;
  /** How many known events share this venue — used to rank suggestions. */
  usage_count: number;
}

interface RawRow {
  location: string | null;
  address: string | null;
  store_url: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
}

interface WorkingRow extends VenueSuggestion {
  updated_at: string;
}

export function listKnownVenues(): VenueSuggestion[] {
  const db = getDb();

  const eventRows = db
    .prepare(`
      SELECT location, address, store_url, latitude, longitude, updated_date AS updated_at
      FROM events
      WHERE location != '' AND status != 'skip'
    `)
    .all() as RawRow[];

  const sourceRows = db
    .prepare(`
      SELECT venue_name AS location, venue_address AS address, '' AS store_url,
             latitude, longitude, created_at AS updated_at
      FROM user_sources
      WHERE venue_name != ''
    `)
    .all() as RawRow[];

  const byKey = new Map<string, WorkingRow>();

  for (const row of [...eventRows, ...sourceRows]) {
    const name = (row.location ?? "").trim();
    const key = name.toLowerCase();
    if (!key) continue;

    const existing = byKey.get(key);
    const updated = row.updated_at ?? "";

    if (!existing) {
      byKey.set(key, {
        name,
        address: row.address ?? "",
        store_url: row.store_url ?? "",
        latitude: row.latitude,
        longitude: row.longitude,
        updated_at: updated,
        usage_count: 1,
      });
      continue;
    }

    existing.usage_count += 1;

    // If this row is newer, let it replace any fields it provides.
    // Otherwise, backfill only the fields the existing (newer) record is missing.
    if (updated > existing.updated_at) {
      if (row.address) existing.address = row.address;
      if (row.store_url) existing.store_url = row.store_url;
      if (row.latitude != null) existing.latitude = row.latitude;
      if (row.longitude != null) existing.longitude = row.longitude;
      existing.updated_at = updated;
    } else {
      if (!existing.address && row.address) existing.address = row.address;
      if (!existing.store_url && row.store_url) existing.store_url = row.store_url;
      if (existing.latitude == null && row.latitude != null) existing.latitude = row.latitude;
      if (existing.longitude == null && row.longitude != null) existing.longitude = row.longitude;
    }
  }

  return Array.from(byKey.values())
    .map(({ updated_at: _, ...venue }) => venue)
    .sort((a, b) => b.usage_count - a.usage_count || a.name.localeCompare(b.name));
}

/** Normalised lookup key — must match the form used in event-image fallback. */
export function venueKey(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

/**
 * URL-safe slug for a venue. Used by the public venue page at
 * /venue/{slug}. Distinct from `venueKey` — that one is a DB lookup key
 * (lowercase, no transformation), this is for URLs (kebab-case, no
 * special chars). Two venues with the same slug after normalization
 * would collide; in practice MTG store names are distinctive enough
 * that hasn't happened, but `findVenueBySlug` handles ties by picking
 * the most-used row.
 */
export function venueSlug(name: string): string {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface VenuePageData {
  name: string;
  address: string;
  store_url: string;
  latitude: number | null;
  longitude: number | null;
  /** Total upcoming/past events the site has on file for this venue —
   *  used as a tie-breaker when two venues share a slug. */
  usage_count: number;
}

/**
 * Resolve a slug back to the canonical venue record. Iterates the
 * venue list (small; rebuilt from current events table on each call)
 * and picks the highest-usage match. Returns null when no venue
 * slugs to the input — the page should 404.
 */
export function findVenueBySlug(slug: string): VenuePageData | null {
  const target = slug.toLowerCase();
  if (!target) return null;
  const all = listKnownVenues();
  const candidates = all.filter((v) => venueSlug(v.name) === target);
  if (candidates.length === 0) return null;
  // Highest usage_count wins; listKnownVenues already sorts that way.
  return candidates[0];
}

/** Where the venue image came from. `manual` means a curator uploaded it and it
 *  must never be overwritten by the auto-fetcher. The other tags identify which
 *  tier of `lib/venue-image-fetcher.ts` produced the image. */
export type VenueImageSource = "manual" | "og_scrape" | "places" | "street_view";

export interface VenueDefault {
  venue_key: string;
  image_url: string;
  updated_at: string;
  image_source: VenueImageSource | null;
  last_fetched_at: string | null;
  attempt_count: number;
}

const VENUE_DEFAULT_COLUMNS =
  "venue_key, image_url, updated_at, image_source, last_fetched_at, attempt_count";

export function getVenueDefault(name: string): VenueDefault | null {
  const key = venueKey(name);
  if (!key) return null;
  const row = getDb()
    .prepare(`SELECT ${VENUE_DEFAULT_COLUMNS} FROM venue_defaults WHERE venue_key = ?`)
    .get(key) as VenueDefault | undefined;
  return row ?? null;
}

export function listVenueDefaults(): VenueDefault[] {
  return getDb()
    .prepare(`SELECT ${VENUE_DEFAULT_COLUMNS} FROM venue_defaults`)
    .all() as VenueDefault[];
}

/**
 * Upsert a venue's default image. `imageUrl` may be empty when `source` indicates
 * a failed auto-fetch attempt — that's the auto-fetcher's way of saying "we tried
 * and got nothing yet; bump the attempt counter and let render-time fall back to
 * a Google Maps Static image." Manual uploads must always pass a real `imageUrl`.
 */
export function setVenueDefault(
  name: string,
  imageUrl: string,
  source: VenueImageSource = "manual",
): VenueDefault {
  const key = venueKey(name);
  if (!key) throw new Error("Venue name is required");
  if (source === "manual" && !imageUrl) {
    throw new Error("image_url is required for manual uploads");
  }
  const isAttemptOnly = !imageUrl;
  // Attempt-only writes (empty imageUrl from a failed auto-fetch) preserve any
  // previously-stored real URL — we just bump the counter and stamp the time.
  if (isAttemptOnly) {
    getDb()
      .prepare(`
        INSERT INTO venue_defaults (venue_key, image_url, updated_at, image_source, last_fetched_at, attempt_count)
        VALUES (?, '', datetime('now'), ?, datetime('now'), 1)
        ON CONFLICT(venue_key) DO UPDATE SET
          last_fetched_at = excluded.last_fetched_at,
          attempt_count   = COALESCE(venue_defaults.attempt_count, 0) + 1
      `)
      .run(key, source);
  } else {
    getDb()
      .prepare(`
        INSERT INTO venue_defaults (venue_key, image_url, updated_at, image_source, last_fetched_at, attempt_count)
        VALUES (?, ?, datetime('now'), ?, datetime('now'), 1)
        ON CONFLICT(venue_key) DO UPDATE SET
          image_url       = excluded.image_url,
          updated_at      = excluded.updated_at,
          image_source    = excluded.image_source,
          last_fetched_at = excluded.last_fetched_at,
          attempt_count   = COALESCE(venue_defaults.attempt_count, 0) + 1
      `)
      .run(key, imageUrl, source);
  }
  return getVenueDefault(name)!;
}

export function deleteVenueDefault(name: string): VenueDefault | null {
  const key = venueKey(name);
  if (!key) return null;
  const existing = getVenueDefault(name);
  if (!existing) return null;
  getDb().prepare("DELETE FROM venue_defaults WHERE venue_key = ?").run(key);
  return existing;
}
