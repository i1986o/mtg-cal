import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const REPO_DB_PATH = path.join(process.cwd(), "data", "mtg-cal.db");
const DB_PATH = process.env.DATABASE_PATH || REPO_DB_PATH;
const VOLUME_MOUNT_TIMEOUT_MS = 30_000;

let db: Database.Database | null = null;

/**
 * True when DATABASE_PATH points at a Railway-style mounted volume (i.e.
 * a path distinct from the in-repo seed DB). Dev/CI/single-container setups
 * don't satisfy this and skip all volume-readiness logic below.
 */
function isUsingVolume(): boolean {
  return Boolean(process.env.DATABASE_PATH) && DB_PATH !== REPO_DB_PATH;
}

/**
 * Heuristic for "Railway has finished mounting the volume": the parent dir of
 * DB_PATH is on a different device than `/`. Until the mount completes, the
 * directory is on the container's root filesystem and shares the same `dev`.
 * Once mounted, the volume is its own device. This is the same trick `mount`
 * itself uses to identify mount points.
 */
function isVolumeReady(): boolean {
  if (!isUsingVolume()) return true;
  try {
    const targetDir = path.dirname(DB_PATH);
    if (!fs.existsSync(targetDir)) return false;
    return fs.statSync(targetDir).dev !== fs.statSync("/").dev;
  } catch {
    return false;
  }
}

/**
 * Synchronously block until the persistent volume is mounted, or `maxMs`
 * elapses. Critical because `instrumentation.ts` calls `getDb()` ~400ms
 * before Railway mounts the volume — without this, SQLite binds its file
 * handle to the ephemeral inode and every subsequent write disappears on
 * container restart.
 *
 * Uses `Atomics.wait` on a SharedArrayBuffer for a real sync sleep (no CPU
 * burn). Fast-paths when the volume is already ready or not in use.
 */
function waitForVolumeSync(maxMs: number = VOLUME_MOUNT_TIMEOUT_MS): void {
  if (!isUsingVolume()) return;
  if (isVolumeReady()) return;
  const view = new Int32Array(new SharedArrayBuffer(4));
  const start = Date.now();
  let waitedMs = 0;
  while (Date.now() - start < maxMs) {
    if (isVolumeReady()) {
      console.log(`[db] volume ready after ${Date.now() - start}ms`);
      return;
    }
    Atomics.wait(view, 0, 0, 100);
    waitedMs = Date.now() - start;
  }
  console.warn(
    `[db] volume mount did not appear within ${maxMs}ms (waited ${waitedMs}ms); proceeding against ephemeral path — writes may not persist`,
  );
}

/**
 * One-shot self-seed of a Railway persistent volume on first boot.
 *
 * When `DATABASE_PATH` points at a volume (e.g. `/data/mtg-cal.db`) and the
 * file doesn't exist there yet — typical state right after the volume is
 * mounted — copy the git-shipped DB at `process.cwd()/data/mtg-cal.db` over
 * to the volume so we don't start from an empty schema. Subsequent boots see
 * an existing file and leave the volume alone, so user/runtime writes survive
 * deploys.
 *
 * Same for the uploads directory: ensure the volume has an `uploads/` sibling
 * so saves don't fail on a missing parent.
 *
 * No-op when `DATABASE_PATH` is unset (= dev / single-container setup using
 * the in-repo DB directly).
 */
function seedVolumeIfNeeded() {
  if (!process.env.DATABASE_PATH) return;
  if (DB_PATH === REPO_DB_PATH) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    if (fs.existsSync(REPO_DB_PATH)) {
      fs.copyFileSync(REPO_DB_PATH, DB_PATH);
      console.log(`[db] seeded volume DB from ${REPO_DB_PATH} → ${DB_PATH}`);
    } else {
      console.log(`[db] no repo DB to seed from; volume DB will be created empty at ${DB_PATH}`);
    }
  }
  // Make sure the uploads dir on the volume exists. The bucket subfolders
  // (`venues/`, `events/`) are created lazily by saveUpload.
  const uploadsDir = path.join(path.dirname(DB_PATH), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function getDb(): Database.Database {
  if (!db) {
    waitForVolumeSync();
    seedVolumeIfNeeded();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
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
      latitude     REAL,
      longitude    REAL,
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

    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      email          TEXT UNIQUE NOT NULL,
      email_verified INTEGER,
      name           TEXT,
      image          TEXT,
      role           TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','organizer','user')),
      suspended      INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now')),
      last_login_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

    CREATE TABLE IF NOT EXISTS accounts (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type                TEXT NOT NULL,
      provider            TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token       TEXT,
      access_token        TEXT,
      expires_at          INTEGER,
      token_type          TEXT,
      scope               TEXT,
      id_token            TEXT,
      session_state       TEXT,
      UNIQUE(provider, provider_account_id)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token      TEXT PRIMARY KEY,
      expires    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      key         TEXT PRIMARY KEY,
      enabled     INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sources (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind           TEXT NOT NULL,
      external_id    TEXT NOT NULL,
      label          TEXT NOT NULL,
      venue_name     TEXT DEFAULT '',
      venue_address  TEXT DEFAULT '',
      latitude       REAL,
      longitude      REAL,
      enabled        INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT DEFAULT (datetime('now')),
      last_synced_at TEXT,
      UNIQUE(kind, external_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_sources_user ON user_sources(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sources_kind ON user_sources(kind);

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      formats       TEXT DEFAULT '[]',
      radius_miles  INTEGER DEFAULT 10,
      days_ahead    INTEGER DEFAULT 7,
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_saves (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_event_saves_user ON event_saves(user_id);
    CREATE INDEX IF NOT EXISTS idx_event_saves_event ON event_saves(event_id);

    -- Per-event RSVPs. status='waitlist' is reserved for Tier 1 (auto-promote
    -- on cancellation); Tier 0 only writes 'going'/'maybe'/'cancelled'.
    CREATE TABLE IF NOT EXISTS event_rsvps (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      status     TEXT NOT NULL CHECK(status IN ('going','maybe','waitlist','cancelled')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status ON event_rsvps(event_id, status);
    CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);

    CREATE TABLE IF NOT EXISTS admin_actions (
      id              TEXT PRIMARY KEY,
      admin_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_event_id TEXT,
      action          TEXT NOT NULL,
      reason          TEXT DEFAULT '',
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);

    CREATE TABLE IF NOT EXISTS venue_defaults (
      venue_key  TEXT PRIMARY KEY,
      image_url  TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations — add columns if they don't exist yet
  try { db.exec("ALTER TABLE events ADD COLUMN latitude REAL"); } catch {}
  try { db.exec("ALTER TABLE events ADD COLUMN longitude REAL"); } catch {}
  try { db.exec("ALTER TABLE events ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL"); } catch {}
  try { db.exec("ALTER TABLE events ADD COLUMN source_type TEXT DEFAULT 'scraper'"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN suspended_reason TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE events ADD COLUMN image_url TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE venue_defaults ADD COLUMN image_source TEXT"); } catch {}
  try { db.exec("ALTER TABLE venue_defaults ADD COLUMN last_fetched_at TEXT"); } catch {}
  try { db.exec("ALTER TABLE venue_defaults ADD COLUMN attempt_count INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE events ADD COLUMN capacity INTEGER"); } catch {}
  try { db.exec("ALTER TABLE events ADD COLUMN rsvp_enabled INTEGER DEFAULT 0"); } catch {}

  // Default settings
  const insert = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  insert.run("scrape_interval_hours", "24");
  insert.run("last_scrape", "");
  insert.run("last_scrape_result", "");

  // Seed runtime config defaults (mirrors lib/config.ts; admin can override via /admin/config)
  insert.run("config_location", JSON.stringify({ zip: "19125", city: "Philadelphia", state: "PA", lat: 39.9688, lng: -75.1246 }));
  insert.run("config_radius_miles", "10");
  insert.run("config_days_ahead", "60");
  insert.run("config_source_wizardslocator", "1");
  insert.run("config_source_topdeck", "1");
  insert.run("config_source_discord_guilds", JSON.stringify(["1451305700322967794"]));

  // Seed starter feature flags
  const insertFlag = db.prepare("INSERT OR IGNORE INTO feature_flags (key, enabled, description) VALUES (?, ?, ?)");
  insertFlag.run("organizer_portal_enabled", 1, "Kill-switch for the /account portal.");
  insertFlag.run("public_organizer_signup", 0, "Allow new signups to auto-promote from `user` to `organizer` (skip review).");
  insertFlag.run("calendar_v2", 0, "Experimental calendar view redesign.");
}
