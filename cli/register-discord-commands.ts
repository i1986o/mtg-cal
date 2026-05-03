// One-shot script: registers the /playirl slash commands with Discord.
//
// Usage:
//   npm run discord:register
//
// Required env:
//   DISCORD_BOT_TOKEN       — bot token (same token the scraper uses)
//   DISCORD_BOT_CLIENT_ID   — application ID (Discord Developer Portal)
//
// Optional env:
//   DISCORD_REGISTER_GUILD_ID — register as a guild-only command (instant
//     propagation; useful for testing). If unset, commands register globally
//     (can take up to an hour to propagate the first time).

import dotenv from "dotenv";
// Load .env first, then let .env.local override (Next.js convention).
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const DISCORD_API = "https://discord.com/api/v10";

// Option types — see https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
const OPT_SUB_COMMAND = 1;
const OPT_STRING = 3;
const OPT_INTEGER = 4;

type Choice = { name: string; value: string | number };

type Option = {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: Choice[];
  options?: Option[];
  min_value?: number;
  max_value?: number;
  autocomplete?: boolean;
};

const FORMAT_CHOICES: Choice[] = [
  { name: "Commander", value: "Commander" },
  { name: "Modern", value: "Modern" },
  { name: "Standard", value: "Standard" },
  { name: "Pioneer", value: "Pioneer" },
  { name: "Legacy", value: "Legacy" },
  { name: "Pauper", value: "Pauper" },
  { name: "Draft", value: "Draft" },
  { name: "Sealed", value: "Sealed" },
];

const RADIUS_CHOICES: Choice[] = [
  { name: "5 miles", value: 5 },
  { name: "10 miles", value: 10 },
  { name: "25 miles", value: 25 },
  { name: "50 miles", value: 50 },
  { name: "100 miles", value: 100 },
];

/**
 * Pull the most-popular venue locations from the events DB so the `near`
 * dropdown reflects current data — the more events at a venue, the more
 * useful it is as a "near here" anchor. Capped at Discord's 25-choice limit.
 *
 * Failure modes: if the DB isn't reachable from the workstation running the
 * register script, we fall back to a small static list so registration never
 * blows up. Re-run the script after the DB is reachable to refresh.
 */
function getNearChoices(): Choice[] {
  try {
    // Lazy import — most callers don't need the DB.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require("../lib/db") as typeof import("../lib/db");
    const rows = getDb().prepare(`
      SELECT location, COUNT(*) AS n
        FROM events
       WHERE location != '' AND visibility = 'public' AND status IN ('active','pinned') AND cancelled_at IS NULL
       GROUP BY location
       ORDER BY n DESC, location ASC
       LIMIT 25
    `).all() as Array<{ location: string; n: number }>;
    if (rows.length === 0) throw new Error("no rows");
    // Dedupe by trimmed/normalized location so trailing whitespace and
    // case variations don't show up as separate dropdown items.
    const seen = new Set<string>();
    const out: Choice[] = [];
    for (const r of rows) {
      const trimmed = r.location.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      // Discord caps choice names at 100 chars.
      out.push({ name: trimmed.slice(0, 100), value: trimmed.slice(0, 100) });
    }
    return out;
  } catch (err) {
    console.warn("[register] couldn't read venues from DB; using static fallback:", err);
    return [
      { name: "Philadelphia, PA", value: "Philadelphia, PA" },
      { name: "King of Prussia, PA", value: "King of Prussia, PA" },
      { name: "Cherry Hill, NJ", value: "Cherry Hill, NJ" },
      { name: "Wilmington, DE", value: "Wilmington, DE" },
    ];
  }
}

const subscribeOptions: Option[] = [
  {
    type: OPT_STRING,
    name: "mode",
    description: "Schedule mode: weekly digest, daily digest, or per-event reminder.",
    required: true,
    choices: [
      { name: "weekly", value: "weekly" },
      { name: "daily", value: "daily" },
      { name: "reminder", value: "reminder" },
    ],
  },
  {
    type: OPT_STRING,
    name: "format",
    description: "Filter: only post events of this format (e.g. Commander, Modern). Omit for all formats.",
  },
  {
    type: OPT_STRING,
    name: "near",
    description: "Filter: city or address to center geo-radius on.",
  },
  {
    type: OPT_INTEGER,
    name: "radius_miles",
    description: "Filter: distance from `near` to include events. Default: no limit.",
    min_value: 1,
    max_value: 500,
  },
  {
    type: OPT_INTEGER,
    name: "hour_utc",
    description: "Hour of day (UTC) to fire weekly/daily digests. Default 14 (≈9am ET).",
    min_value: 0,
    max_value: 23,
  },
  {
    type: OPT_INTEGER,
    name: "dow",
    description: "Weekly only — day of week to fire (0=Sun, 6=Sat). Default 1 (Monday).",
    min_value: 0,
    max_value: 6,
  },
  {
    type: OPT_INTEGER,
    name: "days_ahead",
    description: "Digest window in days (weekly: 7, daily: 1-2). Default 7.",
    min_value: 1,
    max_value: 60,
  },
  {
    type: OPT_STRING,
    name: "lead",
    description: "Reminder only — 1h, 2h, morning_of, day_before, or freeform minutes. Default 1h.",
  },
  {
    type: OPT_STRING,
    name: "source",
    description: "Filter: only post events from this source (wizards-locator, topdeck, discord).",
    choices: [
      { name: "wizards-locator", value: "wizards-locator" },
      { name: "topdeck", value: "topdeck" },
      { name: "discord", value: "discord" },
    ],
  },
];

const NEAR_CHOICES = getNearChoices();

// Built lazily so the DB query above runs once even though both subcommands use the same options.
const lookupOptions: Option[] = [
  { type: OPT_STRING, name: "format", description: "Pick a format (or leave blank for any).", choices: FORMAT_CHOICES },
  { type: OPT_STRING, name: "near", description: "Pick a venue/area to look near.", choices: NEAR_CHOICES },
  { type: OPT_INTEGER, name: "radius_miles", description: "Distance from your chosen venue/area.", choices: RADIUS_CHOICES },
];

const playirlCommand = {
  name: "playirl",
  description: "PlayIRL.GG event lookups and subscriptions.",
  // No default_member_permissions: today/week/help are public, and Discord
  // doesn't support per-subcommand permission gates. The handler enforces
  // Manage Server on subscribe/edit/list/preview/unsubscribe and politely
  // refuses non-admins. Visibility-as-discoverability is the trade.
  options: [
    // -- Public lookup commands (no Manage Server needed) --
    {
      type: OPT_SUB_COMMAND,
      name: "today",
      description: "Show events happening today.",
      options: lookupOptions,
    },
    {
      type: OPT_SUB_COMMAND,
      name: "week",
      description: "Show events in the next 7 days.",
      options: lookupOptions,
    },
    {
      type: OPT_SUB_COMMAND,
      name: "help",
      description: "Show what /playirl can do, with all command options.",
    },
    // -- Admin (Manage Server) commands --
    {
      type: OPT_SUB_COMMAND,
      name: "subscribe",
      description: "Add a new event subscription to this channel.",
      options: subscribeOptions,
    },
    {
      type: OPT_SUB_COMMAND,
      name: "list",
      description: "List subscriptions in this server.",
    },
    {
      type: OPT_SUB_COMMAND,
      name: "unsubscribe",
      description: "Disable a subscription by id.",
      options: [
        { type: OPT_STRING, name: "id", description: "Subscription to disable.", required: true, autocomplete: true },
      ],
    },
    {
      type: OPT_SUB_COMMAND,
      name: "preview",
      description: "Show what a subscription would post right now (ephemeral).",
      options: [
        { type: OPT_STRING, name: "id", description: "Subscription to preview.", required: true, autocomplete: true },
      ],
    },
    {
      type: OPT_SUB_COMMAND,
      name: "edit",
      description: "Change one or more options on an existing subscription.",
      options: [
        { type: OPT_STRING, name: "id", description: "Subscription to edit.", required: true, autocomplete: true },
        ...subscribeOptions
          .filter(o => o.name !== "mode") // mode is structural — re-create instead
          .map(o => ({ ...o, required: false })),
      ],
    },
  ],
};

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_BOT_CLIENT_ID;
  const guildId = process.env.DISCORD_REGISTER_GUILD_ID;

  if (!token) throw new Error("DISCORD_BOT_TOKEN is required");
  if (!appId) throw new Error("DISCORD_BOT_CLIENT_ID is required");

  const path = guildId
    ? `/applications/${appId}/guilds/${guildId}/commands`
    : `/applications/${appId}/commands`;

  const res = await fetch(`${DISCORD_API}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([playirlCommand]),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[register] HTTP ${res.status}: ${body}`);
    process.exit(1);
  }

  const scope = guildId ? `guild ${guildId}` : "global";
  console.log(`[register] /playirl registered (${scope}).`);
  console.log(body);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
