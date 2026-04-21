# 🃏 MTG Calendar Aggregator

Pulls Magic: The Gathering events from multiple sources into a subscribable `.ics` calendar.

## Quick Start

```bash
git clone https://github.com/i1986o/mtg-cal.git
cd mtg-cal
npm install
npm run fetch
```

Outputs `output/mtg-events.ics`.

## Subscribe URL (after enabling GitHub Pages)

```
https://i1986o.github.io/mtg-cal/output/mtg-events.ics
```

Add to Google Calendar: Other calendars → From URL → paste above.

## Config

Edit `lib/config.ts` to change location, radius, format filters, or source settings.

## Sources
- ✅ WotC Store & Event Locator (GraphQL API, confirmed April 2026) — `scrapers/wizards-locator.ts`
- ✅ TopDeck API — `scrapers/topdeck.ts` (requires `TOPDECK_API_KEY`)
- ✅ Discord bot — `scrapers/discord.ts` (requires `DISCORD_BOT_TOKEN`)

## Auto-refresh

GitHub Actions runs daily at 10am UTC and commits the updated `.ics` files + `data/mtg-cal.db` back to the repo. See `.github/workflows/refresh.yml`.
