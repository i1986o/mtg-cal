import { getDb } from "./db";

export interface EventRow {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  address: string;
  cost: string;
  store_url: string;
  detail_url: string;
  latitude: number | null;
  longitude: number | null;
  source: string;
  status: string;
  notes: string;
  added_date: string;
  updated_date: string;
  owner_id: string | null;
  source_type: string;
}

export interface ScrapedEvent {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  address: string;
  cost: string;
  store_url: string;
  detail_url: string;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
}

export function upsertEvents(events: ScrapedEvent[]): {
  added: number;
  updated: number;
  skipped: number;
} {
  const db = getDb();
  const now = new Date().toISOString().split("T")[0];

  const getStmt = db.prepare("SELECT status, notes, added_date, owner_id, source_type FROM events WHERE id = ?");

  const insertStmt = db.prepare(`
    INSERT INTO events (id, title, format, date, time, timezone, location, address, cost, store_url, detail_url, latitude, longitude, source, status, notes, added_date, updated_date, source_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', '', ?, ?, 'scraper')
  `);

  // Note: owner_id and source_type are intentionally omitted from UPDATE so they survive scraper re-runs (same pattern as pinned/skip).
  const updateStmt = db.prepare(`
    UPDATE events SET title=?, format=?, date=?, time=?, timezone=?, location=?, address=?, cost=?, store_url=?, detail_url=?, latitude=?, longitude=?, source=?, status=?, updated_date=?
    WHERE id=?
  `);

  let added = 0, updated = 0, skipped = 0;

  const upsert = db.transaction(() => {
    for (const ev of events) {
      const existing = getStmt.get(ev.id) as { status: string; notes: string; added_date: string; owner_id: string | null; source_type: string | null } | undefined;

      if (!existing) {
        insertStmt.run(ev.id, ev.title, ev.format, ev.date, ev.time, ev.timezone, ev.location, ev.address, ev.cost, ev.store_url, ev.detail_url, ev.latitude ?? null, ev.longitude ?? null, ev.source, now, now);
        added++;
      } else if (existing.source_type === "organizer" || existing.owner_id) {
        // Organizer-owned events are authoritative — never overwritten by scrapers.
        skipped++;
      } else if (existing.status === "pinned") {
        skipped++;
      } else {
        // Preserve skip status on update
        const status = existing.status === "skip" ? "skip" : "active";
        updateStmt.run(ev.title, ev.format, ev.date, ev.time, ev.timezone, ev.location, ev.address, ev.cost, ev.store_url, ev.detail_url, ev.latitude ?? null, ev.longitude ?? null, ev.source, status, now, ev.id);
        updated++;
      }
    }
  });

  upsert();
  return { added, updated, skipped };
}

// Haversine distance in miles
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getActiveEvents(filters?: {
  format?: string;
  from?: string;
  to?: string;
  radiusMiles?: number;
  centerLat?: number;
  centerLng?: number;
}): EventRow[] {
  const db = getDb();
  let sql = "SELECT * FROM events WHERE status IN ('active', 'pinned')";
  const params: (string | number)[] = [];

  if (filters?.format) {
    sql += " AND format = ?";
    params.push(filters.format);
  }
  if (filters?.from) {
    sql += " AND date >= ?";
    params.push(filters.from);
  }
  if (filters?.to) {
    sql += " AND date <= ?";
    params.push(filters.to);
  }

  sql += " ORDER BY date ASC, time ASC";
  let rows = db.prepare(sql).all(...params) as EventRow[];

  // Filter by distance if radius is specified
  if (filters?.radiusMiles && filters?.centerLat != null && filters?.centerLng != null) {
    const maxMiles = filters.radiusMiles;
    const cLat = filters.centerLat;
    const cLng = filters.centerLng;
    const before = rows.length;
    rows = rows.filter(ev => {
      if (ev.latitude == null || ev.longitude == null) return true; // include events without coords
      return haversineDistance(cLat, cLng, ev.latitude, ev.longitude) <= maxMiles;
    });
    // debug: console.log(`[filter] radius=${maxMiles}mi: ${before} → ${rows.length} events`);
  }

  return rows;
}

export function getAllEvents(): EventRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM events ORDER BY date ASC, time ASC").all() as EventRow[];
}

export function getEvent(id: string): EventRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
}

export function updateEventStatus(id: string, status: string, notes?: string): boolean {
  const db = getDb();
  const now = new Date().toISOString().split("T")[0];
  if (notes !== undefined) {
    const r = db.prepare("UPDATE events SET status=?, notes=?, updated_date=? WHERE id=?").run(status, notes, now, id);
    return r.changes > 0;
  }
  const r = db.prepare("UPDATE events SET status=?, updated_date=? WHERE id=?").run(status, now, id);
  return r.changes > 0;
}

export function getFormats(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT format FROM events WHERE status IN ('active','pinned') AND format != '' ORDER BY format").all() as { format: string }[];
  return rows.map(r => r.format);
}

export function archiveOldEvents(daysOld: number = 90): number {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const r = db.prepare("DELETE FROM events WHERE date < ? AND status != 'pinned'").run(cutoffStr);
  return r.changes;
}

export function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value || "";
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

// ----- Manual / organizer event mutations -----

export type EventInput = Partial<Omit<EventRow, "id" | "added_date" | "updated_date">> & {
  id?: string;
};

const VALID_STATUSES = new Set(["active", "skip", "pinned", "pending"]);

export function createEvent(input: EventInput & { id: string; title: string; date: string; source: string }): EventRow {
  const db = getDb();
  const now = new Date().toISOString().split("T")[0];
  db.prepare(`
    INSERT INTO events (id, title, format, date, time, timezone, location, address, cost, store_url, detail_url, latitude, longitude, source, status, notes, added_date, updated_date, owner_id, source_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.title,
    input.format ?? "",
    input.date,
    input.time ?? "",
    input.timezone ?? "America/New_York",
    input.location ?? "",
    input.address ?? "",
    input.cost ?? "",
    input.store_url ?? "",
    input.detail_url ?? "",
    input.latitude ?? null,
    input.longitude ?? null,
    input.source,
    VALID_STATUSES.has(input.status ?? "") ? input.status : "active",
    input.notes ?? "",
    now,
    now,
    input.owner_id ?? null,
    input.source_type ?? "manual",
  );
  return getEvent(input.id)!;
}

export function updateEvent(id: string, patch: EventInput): EventRow | undefined {
  const db = getDb();
  const existing = getEvent(id);
  if (!existing) return undefined;
  const now = new Date().toISOString().split("T")[0];
  const merged = { ...existing, ...patch };
  if (!VALID_STATUSES.has(merged.status)) merged.status = existing.status;
  db.prepare(`
    UPDATE events SET
      title=?, format=?, date=?, time=?, timezone=?, location=?, address=?, cost=?,
      store_url=?, detail_url=?, latitude=?, longitude=?, status=?, notes=?, updated_date=?
    WHERE id=?
  `).run(
    merged.title, merged.format, merged.date, merged.time, merged.timezone, merged.location,
    merged.address, merged.cost, merged.store_url, merged.detail_url,
    merged.latitude ?? null, merged.longitude ?? null,
    merged.status, merged.notes, now, id,
  );
  return getEvent(id);
}

export function deleteEvent(id: string): boolean {
  const r = getDb().prepare("DELETE FROM events WHERE id = ?").run(id);
  return r.changes > 0;
}

export function bulkUpdateStatus(ids: string[], status: string): number {
  if (ids.length === 0 || !VALID_STATUSES.has(status)) return 0;
  const db = getDb();
  const now = new Date().toISOString().split("T")[0];
  const placeholders = ids.map(() => "?").join(",");
  const r = db.prepare(`UPDATE events SET status=?, updated_date=? WHERE id IN (${placeholders})`).run(status, now, ...ids);
  return r.changes;
}

export function bulkDelete(ids: string[]): number {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const r = getDb().prepare(`DELETE FROM events WHERE id IN (${placeholders})`).run(...ids);
  return r.changes;
}

export function getEventsByOwner(ownerId: string): EventRow[] {
  return getDb().prepare("SELECT * FROM events WHERE owner_id = ? ORDER BY date ASC, time ASC").all(ownerId) as EventRow[];
}
