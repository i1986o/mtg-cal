import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "mtg-cal.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      format       TEXT DEFAULT '',
      date         TEXT NOT NULL,
      time         TEXT DEFAULT '',
      timezone     TEXT DEFAULT 'America/New_York',
      location     TEXT DEFAULT '',
      address      TEXT DEFAULT '',
      cost         TEXT DEFAULT '',
      store_url    TEXT DEFAULT '',
      detail_url   TEXT DEFAULT '',
      source       TEXT NOT NULL,
      status       TEXT DEFAULT 'active' CHECK(status IN ('active','skip','pinned','pending')),
      notes        TEXT DEFAULT '',
      added_date   TEXT DEFAULT (date('now')),
      updated_date TEXT DEFAULT (date('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_format ON events(format);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Default settings
  const insert = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  insert.run("scrape_interval_hours", "24");
  insert.run("last_scrape", "");
  insert.run("last_scrape_result", "");
}
