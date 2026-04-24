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

GitHub Actions runs daily at 10am UTC and commits the updated `.ics` files + `data/mtg-cal.db` back to the repo. See `.github/workflows/refresh.yml`.

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

### First-time admin bootstrap

1. Set `ADMIN_EMAILS=you@example.com` in `.env`.
2. Sign in via OAuth at `/admin/login`.
3. The Auth.js `signIn` callback promotes your user record to `role='admin'`.
4. From `/admin/users`, promote teammates to `admin` or `organizer` as needed.

## Deployment notes

- **Railway**: SQLite at `data/mtg-cal.db` requires a persistent volume mounted at the project's `data/` directory. Without it, every redeploy wipes events, users, and sessions.
- **Resend sender domain**: requires DNS TXT records for `playirl.gg`. Until that's set, magic-link emails won't deliver.
- **OAuth callback URIs** must be registered exactly as `https://playirl.gg/api/auth/callback/{discord,google}` in each provider's developer console.
