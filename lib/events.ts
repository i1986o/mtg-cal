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
  source: string;
  status: string;
  notes: string;
  added_date: string;
  updated_date: string;
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
  source: string;
}

export function upsertEvents(events: ScrapedEvent[]): {
  added: number;
  updated: number;
  skipped: number;
} {
  const db = getDb();
  const now = new Date().toISOString().split("T")[0];

  const getStmt = db.prepare("SELECT status, notes, added_date FROM events WHERE id = ?");

  const insertStmt = db.prepare(`
    INSERT INTO events (id, title, format, date, time, timezone, location, address, cost, store_url, detail_url, source, status, notes, added_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', '', ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE events SET title=?, format=?, date=?, time=?, timezone=?, location=?, address=?, cost=?, store_url=?, detail_url=?, source=?, status=?, updated_date=?
    WHERE id=?
  `);

  let added = 0, updated = 0, skipped = 0;

  const upsert = db.transaction(() => {
    for (const ev of events) {
      const existing = getStmt.get(ev.id) as { status: string; notes: string; added_date: string } | undefined;

      if (!existing) {
        insertStmt.run(ev.id, ev.title, ev.format, ev.date, ev.time, ev.timezone, ev.location, ev.address, ev.cost, ev.store_url, ev.detail_url, ev.source, now, now);
        added++;
      } else if (existing.status === "pinned") {
        skipped++;
      } else {
        // Preserve skip status on update
        const status = existing.status === "skip" ? "skip" : "active";
        updateStmt.run(ev.title, ev.format, ev.date, ev.time, ev.timezone, ev.location, ev.address, ev.cost, ev.store_url, ev.detail_url, ev.source, status, now, ev.id);
        updated++;
      }
    }
  });

  upsert();
  return { added, updated, skipped };
}

export function getActiveEvents(filters?: { format?: string; from?: string; to?: string }): EventRow[] {
  const db = getDb();
  let sql = "SELECT * FROM events WHERE status IN ('active', 'pinned')";
  const params: string[] = [];

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
  return db.prepare(sql).all(...params) as EventRow[];
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
