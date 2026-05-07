# `data/` directory

The SQLite database (`mtg-cal.db`) **is not tracked in git**. It's recreated on demand:

- **Local dev**: `getDb()` in `lib/db.ts` opens `<repo>/data/mtg-cal.db`. If the file doesn't exist, `better-sqlite3` creates an empty one and `initSchema()` populates schema + reference data (settings, feature flags). Every subsequent boot is idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`).
- **Railway prod**: `DATABASE_PATH=/data/mtg-cal.db` points at a persistent volume. The first boot creates the DB on the volume and runs `initSchema()`. Subsequent deploys reuse the volume DB so user state, RSVPs, uploads, and scraped events all survive.

**Source of truth for schema**: `lib/db.ts` `initSchema()`. To inspect a fresh DB's schema without running the app, run `sqlite3 data/mtg-cal.db .schema` after a `getDb()` call.

**Why we stopped committing it**: at nationwide scrape volume the file would balloon (estimated ~30–50 MB at 100x scale). Every clone, pull, and CI run would carry that weight. Production already runs off the Railway volume, so the committed copy was only useful as a seed — and the seed is now generated from code instead.
