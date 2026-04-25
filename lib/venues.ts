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
