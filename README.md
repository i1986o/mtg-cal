# 🃏 MTG Calendar Aggregator

Pulls Magic: The Gathering events from multiple sources into a subscribable `.ics` calendar and a Next.js web UI (PlayIRL.GG).

## Quick Start

```bash
git clone https://github.com/i1986o/mtg-cal.git
cd mtg-cal
npm install
npm run fetch     # one-shot scrape → output/mtg-events.ics
npm run dev       # Next.js web UI on http://localhost:3000
```

## Subscribe URL

```
https://playirl.gg/calendar
```

Add to Google Calendar: Other calendars → From URL → paste above.

## Sources
- ✅ WotC Store & Event Locator (GraphQL API, confirmed April 2026) — `scrapers/wizards-locator.ts`
- ✅ TopDeck API — `scrapers/topdeck.ts` (requires `TOPDECK_API_KEY`)
- ✅ Discord bot — `scrapers/discord.ts` (requires `DISCORD_BOT_TOKEN`)

## Auto-refresh

GitHub Actions runs daily at 10am UTC and commits the updated `.ics` files back to the repo. The SQLite DB lives on Railway's persistent volume in production and is **not** committed (see `data/README.md`). See `.github/workflows/refresh.yml`.

## DB backups

`.github/workflows/backup.yml` runs daily at 11am UTC (1 hour after refresh), pulls a consistent gzipped SQLite snapshot from `/api/internal/backup`, and stores it as a GitHub Actions artifact with **30-day retention**. To enable:

1. Generate a secret: `openssl rand -hex 32`.
2. Set it on Railway as `BACKUP_SECRET=<value>`.
3. Set the **same value** in the repo's Actions secrets (`Settings → Secrets and variables → Actions → New secret`) as `BACKUP_SECRET`.

The endpoint uses better-sqlite3's `serialize()` to capture both the main DB file and any uncommitted WAL writes in a single consistent snapshot — safe to call against a live, write-active DB.

To restore: download the latest artifact from the **Actions → DB Backup** run, `gunzip` it, then copy onto the Railway volume at `$DATABASE_PATH` while the service is stopped. The seed-on-empty logic in `lib/db.ts` only fires when the file is missing, so an existing-but-broken volume DB needs to be replaced manually before redeploy.

## Configuration

`lib/config.ts` holds the static **defaults** (location, radius, days-ahead, source toggles). Once the app is running, the admin can override any of these from `/admin/config` — overrides are stored in the SQLite `settings` table and read at scrape time via `lib/runtime-config.ts`. To change defaults at the code level, edit `lib/config.ts`.

## Admin & Account Portals

There are two authenticated areas:

- **`/admin`** — the operator's dashboard: full event CRUD, user management, feature flags, runtime config, manual scraper runs, pending-event approval queue.
- **`/account`** — public-facing user portal. Anyone can sign in to submit events and connect private event sources (e.g. their own Discord server). Submissions from base `user` accounts land as `pending` and require admin approval before appearing on the public calendar. `organizer` and `admin` accounts publish immediately.

### Auth setup

Authentication runs through [Auth.js v5](https://authjs.dev) on top of a custom `better-sqlite3` adapter (`lib/auth-adapter.ts`). The legacy password-only login at `/admin/login` still works as a **break-glass** path.

Required env vars (see `.env.example`):

```env
# Auth.js
AUTH_SECRET=                 # openssl rand -base64 32
AUTH_URL=https://playirl.gg
AUTH_TRUST_HOST=true
ADMIN_EMAILS=you@example.com # comma-separated; auto-promoted to admin role on signin

# Discord OAuth — https://discord.com/developers
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
# Redirect URI: https://playirl.gg/api/auth/callback/discord

# Google OAuth — https://console.cloud.google.com
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
# Redirect URI: https://playirl.gg/api/auth/callback/google

# Resend magic-link email — https://resend.com
AUTH_RESEND_KEY=
AUTH_EMAIL_FROM="PlayIRL <noreply@playirl.gg>"   # sender domain must be verified in Resend

# Legacy break-glass admin login (optional)
SESSION_SECRET=                # HMAC key for the legacy `mtg-cal-session` cookie
ADMIN_PASSWORD_HASH=           # bcryptjs hash; in dev, "admin" is accepted if unset
```

Providers without configured env vars are silently skipped — you can ship with just one (e.g. Discord) and add others later.

### Venue / event images

Every event card is rendered through the cascade in `lib/event-image.ts`:

```
event.image_url                            (Discord cover image, host upload)
  → venue_defaults[venueKey(location)]     (admin upload OR auto-fetched: og:image / Places photo / Street View)
  → googleMapsStaticUrl(latitude, longitude) (render-time map; NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY w/ Maps Static API enabled)
  → SOURCE_FALLBACKS[source_type]          (generic per-source icon)
  → /images/event-placeholder.svg
```

Two Google Cloud keys upgrade the experience:

```env
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=  # public Google Maps Platform key. Powers the embedded
                                    # iframe on event detail pages AND the static-map fallback
                                    # in the image cascade. Enable: Maps Embed API + Maps Static API.
                                    # Restrict by HTTP referrer.
GOOGLE_PLACES_API_KEY=              # server-only. Enables real venue photos via Places + Street View
                                    # AND the Google Geocoding API used by lib/geocode.ts /
                                    # cli/backfill-event-coords.ts. Enable: Places API (New),
                                    # Street View Static API, Geocoding API. Restrict by IP.
```

Graceful degradation: with neither set, the cascade still works — you just get the source-type icon for non-Discord events, same as today.

One-time backfills after deploy:

```bash
npx tsx --env-file=.env cli/backfill-event-coords.ts    # geocode events with address-but-no-coords
npx tsx --env-file=.env cli/backfill-venue-images.ts    # try to attach a real photo to every known venue
```

Both are idempotent. The scraper auto-runs the venue-image step on each scrape for newly-seen venues.

### Location data policy

**Street address is the source of truth.** Lat/lng is treated as derived metadata used for distance filtering and the (rare) APIs that don't accept text queries.

- **Render-time** — every map embed, "Open in Maps" link, and ICS calendar `LOCATION:` field is built from `event.address` text (Google Maps / OpenStreetMap geocode it on display). The only render path that requires lat/lng is `lib/event-image.ts`'s Google Maps Static hero map, which is reached only when no event/venue photo exists.
- **Ingest-time** — each `ScrapedEvent` carries a `coords_source` tag (`"source"` | `"guild_fallback"` | `"none"`). Scrapers whose APIs return per-event coords (WotC, TopDeck) tag them `"source"`; sources that fall back to a guild-wide hardcode (Discord) tag them `"guild_fallback"`. After dedupe and before upsert, `lib/scraper.ts` runs `reconcileEventCoords()` which re-geocodes every non-`"source"` event from its address using `lib/geocode.ts` (Google Geocoding API if `GOOGLE_PLACES_API_KEY` is set, OpenStreetMap Nominatim otherwise — free, no key).
- **Backfill** — `cli/backfill-event-coords.ts` accepts `--source-prefix <X>` to re-derive coords for an existing source's rows, e.g. `npx tsx --env-file=.env cli/backfill-event-coords.ts --source-prefix discord` cleans up rows that inherited a stale `GUILD_COORDS` literal.

Net effect: address-text and lat/lng always agree, regardless of which the renderer queries.

### First-time admin bootstrap

1. Set `ADMIN_EMAILS=you@example.com` in `.env`.
2. Sign in via OAuth at `/admin/login`.
3. The Auth.js `signIn` callback promotes your user record to `role='admin'`.
4. From `/admin/users`, promote teammates to `admin` or `organizer` as needed.

## Deployment notes

- **Railway**: SQLite + uploaded images both live on a persistent volume.
  - Mount a volume at `/data` (or any path, just be consistent).
  - Set `DATABASE_PATH=/data/mtg-cal.db` (or `<your-mount>/mtg-cal.db`) — `lib/db.ts` derives both the DB path and the `uploads/` sibling from this. On first boot the volume is empty; `initSchema()` creates the schema and seeds reference data (settings, feature flags). The scraper populates events on the next run. Subsequent deploys reuse the volume so user state, RSVPs, uploads, and scraped events survive.
  - Without `DATABASE_PATH` set, the app falls back to `<cwd>/data/mtg-cal.db` — fine for local dev. The DB file is gitignored; first run creates it empty, then `npm run fetch` populates events.
  - The CI workflow at `.github/workflows/refresh.yml` commits only the static `output/*.ics` calendar feeds — the DB is never committed. Production is the source of truth.
- **Resend sender domain**: requires DNS TXT records for `playirl.gg`. Until that's set, magic-link emails won't deliver.
- **OAuth callback URIs** must be registered exactly as `https://playirl.gg/api/auth/callback/{discord,google}` in each provider's developer console.

## Discord subscription bot

Server admins can add the PlayIRL.GG bot to their Discord, then subscribe channels to event digests and reminders via slash commands. The user-facing landing page is at `/bot`.

### One-time setup (deployer)

1. **Create the Discord application + bot user** at <https://discord.com/developers/applications>. From the bot tab, copy the bot token; from General Information, copy the Application ID and the Public Key.

2. **Set Railway env vars:**
   ```
   DISCORD_BOT_TOKEN=<bot token>
   DISCORD_BOT_CLIENT_ID=<application id>
   DISCORD_BOT_PUBLIC_KEY=<public key, hex>
   DISPATCH_SECRET=<random string — `openssl rand -hex 32`>
   ```

3. **Register the slash commands.** From a workstation with the env vars set:
   ```
   npm run discord:register
   ```
   Optionally set `DISCORD_REGISTER_GUILD_ID=<your test guild>` to register guild-only (instant propagation; useful for testing). Without it, registration is global and may take up to an hour the first time.

4. **Set the Interactions Endpoint URL** in the Discord Developer Portal to:
   ```
   https://playirl.gg/api/discord/interactions
   ```
   Discord PINGs the URL immediately to validate signature handling — the call is rejected unless `DISCORD_BOT_PUBLIC_KEY` is set correctly.

5. **Configure Railway Cron** to fire the dispatcher every 5 minutes:
   ```
   Schedule: */5 * * * *
   Command:  curl -X POST https://playirl.gg/api/discord/dispatch \
                  -H "x-dispatch-secret: $DISPATCH_SECRET"
   ```
   The dispatcher self-gates: only weekly subs whose `(dow, hour_utc)` matches the current tick fire, only daily subs at the right hour, and reminders only fire when an event start sits inside the [now+lead, now+lead+5min) window. Missed ticks are picked up by the next tick within the same window thanks to the idempotency ledger.

6. **Verify** by inviting the bot to a test guild via `/bot`, running `/playirl subscribe mode:weekly format:Commander`, then `/playirl preview <id>`.

### How users add it

Direct admins to <https://playirl.gg/bot> — the page has the Add-to-Discord button (already pre-filtered to the right OAuth scopes and permissions) and a full command reference.

### Architecture notes

- HTTP Interactions only — no Discord Gateway connection. Compatible with Railway's stateless single-service deploy.
- Ed25519 signature verification uses Node's built-in `crypto.verify`; no `tweetnacl` dependency.
- Subscription state lives in two SQLite tables: `discord_subscriptions` and `discord_subscription_posts` (composite-PK ledger that enforces exactly-once-per-bucket posting).
- All slash command handlers that need network I/O (geocoding, etc.) use Discord's deferred-response pattern so we never blow the 3-second ack budget.
