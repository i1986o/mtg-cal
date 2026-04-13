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

Edit `config.js` to change location, radius, format filters, or enable Discord/store scrapers.

## Sources
- ✅ WotC Store & Event Locator (GraphQL API, confirmed April 2026)
- 🔧 Discord bot (stubbed, see `src/sources/discord.js`)
- 🔧 Store website scraper (stubbed, see `src/sources/custom-stores.js`)

## Auto-refresh

GitHub Actions runs daily at 6am ET and commits the updated `.ics` back to the repo.
