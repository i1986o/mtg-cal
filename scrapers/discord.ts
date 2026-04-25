// Discord Scheduled Events source
// Reads upcoming events from Discord servers the bot has access to.
// Only includes events with "MTG" or Magic-related keywords in the title.

import type { ScrapedEvent } from "./index";

const DISCORD_API = "https://discord.com/api/v10";

// Known guild coordinates for distance filtering (admin-configured defaults).
const GUILD_COORDS: Record<string, { lat: number; lng: number; address: string }> = {
  "1451305700322967794": { lat: 39.9518, lng: -75.1849, address: "226 Walnut St, Philadelphia, PA 19106" }, // Hamilton's Hand
};

// Keywords that identify an MTG event
const MTG_KEYWORDS = ["mtg", "magic", "commander", "modern", "standard", "pioneer", "legacy", "pauper", "draft", "sealed"];

// Extract format from event name (e.g. "MTG Commander Casual Play" → "Commander")
function extractFormat(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("commander")) return "Commander";
  if (lower.includes("modern")) return "Modern";
  if (lower.includes("standard")) return "Standard";
  if (lower.includes("pioneer")) return "Pioneer";
  if (lower.includes("legacy")) return "Legacy";
  if (lower.includes("pauper")) return "Pauper";
  if (lower.includes("draft")) return "Draft";
  if (lower.includes("sealed")) return "Sealed";
  return "";
}

// Extract cost from description (looks for "No Entry Fee", "$X", "entry fee", etc.)
function extractCost(description: string): string {
  if (!description) return "";
  if (/no entry fee/i.test(description)) return "Free";
  if (/free/i.test(description)) return "Free";
  const match = description.match(/\$(\d+)/);
  if (match) return "$" + match[1];
  return "";
}

function parseEventName(name: string) {
  const parts = name.split(/\s*-\s*/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), locationHint: parts.slice(1).join(" - ").trim() };
  }
  return { title: name.trim(), locationHint: "" };
}

function cleanDescription(desc: string): string {
  if (!desc) return "";
  let clean = desc.replace(/<:[^>]+>/g, "").replace(/<@[^>]+>/g, "").replace(/<t:\d+:[^>]+>/g, "");
  const descMatch = clean.match(/\*\*Description:\*\*\s*([\s\S]*?)$/);
  if (descMatch) return descMatch[1].trim();
  return clean.replace(/\*\*/g, "").trim();
}

export interface DiscordGuildSpec {
  guildId: string;
  /** When set, events from this guild are owned by the given user and default to "pending". */
  ownerId?: string | null;
  /** Per-guild venue metadata (overrides GUILD_COORDS and locationHint). */
  venueName?: string;
  venueAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  /** Insert status override — defaults to "active" for admin sources, "pending" for user sources. */
  status?: "active" | "pending";
  /** Overrides the `source` tag on emitted events. Defaults to "discord". */
  sourceTag?: string;
  /** Overrides `source_type`. Defaults to "scraper" for admin sources, "user-discord" for user sources. */
  sourceType?: string;
}

export interface DiscordScraperConfig {
  botToken?: string;
  /** Admin-configured guild IDs (strings) — back-compat with runtime-config. */
  guildIds?: string[];
  /** Rich per-guild specs (from user_sources). Takes precedence over guildIds for matching IDs. */
  guilds?: DiscordGuildSpec[];
}

export default async function fetchDiscordEvents(sourceConfig: DiscordScraperConfig = {}): Promise<ScrapedEvent[]> {
  const botToken = sourceConfig.botToken || process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn("[discord] No bot token — set DISCORD_BOT_TOKEN env var");
    return [];
  }

  // Build the unified guild spec list: rich specs first, plain IDs second (if not already present).
  const specs: DiscordGuildSpec[] = [];
  const seen = new Set<string>();
  for (const g of sourceConfig.guilds ?? []) {
    if (!seen.has(g.guildId)) {
      specs.push(g);
      seen.add(g.guildId);
    }
  }
  const plainIds = sourceConfig.guildIds ?? (process.env.DISCORD_GUILD_IDS || "").split(",").filter(Boolean);
  for (const id of plainIds) {
    if (!seen.has(id)) {
      specs.push({ guildId: id });
      seen.add(id);
    }
  }

  if (specs.length === 0) {
    console.warn("[discord] No guilds configured");
    return [];
  }

  const headers = { Authorization: `Bot ${botToken}` };
  const allEvents: ScrapedEvent[] = [];

  for (const spec of specs) {
    let guildName = spec.guildId;
    try {
      const guildRes = await fetch(`${DISCORD_API}/guilds/${spec.guildId}`, { headers });
      if (guildRes.ok) {
        const guild = await guildRes.json();
        guildName = guild.name || spec.guildId;
      }
    } catch {
      /* ignore */
    }

    const res = await fetch(`${DISCORD_API}/guilds/${spec.guildId}/scheduled-events`, { headers });
    if (!res.ok) {
      console.error(`[discord] Failed to fetch events from guild ${guildName}: HTTP ${res.status}`);
      continue;
    }

    const events = await res.json();

    const mtgEvents = (events as any[]).filter((ev) => {
      const name = (ev.name || "").toLowerCase();
      return MTG_KEYWORDS.some((kw) => name.includes(kw));
    });

    console.log(`[discord] ${guildName}: ${mtgEvents.length} MTG events (of ${(events as any[]).length} total)`);

    const fallbackCoords = GUILD_COORDS[spec.guildId];
    const isUserSource = !!spec.ownerId;
    const sourceTag = spec.sourceTag ?? (isUserSource ? `discord:${spec.ownerId}:${spec.guildId}` : "discord");
    const sourceType = spec.sourceType ?? (isUserSource ? "user-discord" : "scraper");
    const status = spec.status ?? (isUserSource ? "pending" : "active");

    for (const ev of mtgEvents) {
      const start = new Date(ev.scheduled_start_time);
      const { title, locationHint } = parseEventName(ev.name);
      const desc = cleanDescription(ev.description);
      // Discord exposes a cover image as an opaque hash; the public CDN URL
      // is constructed from {guild_id, event_id, hash}. Hotlinked from there.
      const imageUrl = ev.image
        ? `https://cdn.discordapp.com/guild-events/${ev.guild_id}/${ev.id}/${ev.image}.png?size=1024`
        : "";

      allEvents.push({
        id: isUserSource ? `discord-${spec.guildId}-${ev.id}` : `discord-${ev.id}`,
        title,
        format: extractFormat(ev.name),
        date: start.toISOString().slice(0, 10),
        time: start.toISOString().slice(11, 16),
        timezone: "America/New_York",
        location: spec.venueName || locationHint,
        address: spec.venueAddress || fallbackCoords?.address || "",
        cost: extractCost(ev.description) || (desc ? "" : ""),
        store_url: "",
        detail_url: `https://discord.com/events/${ev.guild_id}/${ev.id}`,
        latitude: spec.latitude ?? fallbackCoords?.lat ?? null,
        longitude: spec.longitude ?? fallbackCoords?.lng ?? null,
        source: sourceTag,
        owner_id: spec.ownerId ?? null,
        source_type: sourceType,
        status,
        image_url: imageUrl,
      });
    }
  }

  return allEvents;
}
