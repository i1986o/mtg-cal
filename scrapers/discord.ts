// Discord Scheduled Events source
// Reads upcoming events from Discord servers the bot has access to.
// Only includes events with "MTG" or Magic-related keywords in the title.

const DISCORD_API = "https://discord.com/api/v10";

// Known guild coordinates for distance filtering
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

// Parse the event name to extract title and location
// Pattern: "MTG Commander Casual Play - Hamiltons Hand 226 Walnut"
function parseEventName(name: string) {
  const parts = name.split(/\s*-\s*/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), locationHint: parts.slice(1).join(" - ").trim() };
  }
  return { title: name.trim(), locationHint: "" };
}

// Clean Raid-Helper markdown from description
function cleanDescription(desc: string): string {
  if (!desc) return "";
  // Remove Discord emoji codes, user mentions, timestamps
  let clean = desc.replace(/<:[^>]+>/g, "").replace(/<@[^>]+>/g, "").replace(/<t:\d+:[^>]+>/g, "");
  // Extract just the Description section if present
  const descMatch = clean.match(/\*\*Description:\*\*\s*([\s\S]*?)$/);
  if (descMatch) return descMatch[1].trim();
  return clean.replace(/\*\*/g, "").trim();
}

export default async function fetchDiscordEvents(sourceConfig: any = {}) {
  const botToken = sourceConfig.botToken || process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn("[discord] No bot token — set DISCORD_BOT_TOKEN env var");
    return [];
  }

  const guildIds = sourceConfig.guildIds || (process.env.DISCORD_GUILD_IDS || "").split(",").filter(Boolean);
  if (guildIds.length === 0) {
    console.warn("[discord] No guild IDs configured — set DISCORD_GUILD_IDS env var");
    return [];
  }

  const headers = { "Authorization": `Bot ${botToken}` };
  const allEvents = [];

  for (const guildId of guildIds) {
    let guildName = guildId;
    try {
      // Try to get guild name for logging
      const guildRes = await fetch(`${DISCORD_API}/guilds/${guildId}`, { headers });
      if (guildRes.ok) {
        const guild = await guildRes.json();
        guildName = guild.name || guildId;
      }
    } catch (e) { /* ignore */ }

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/scheduled-events`, { headers });
    if (!res.ok) {
      console.error(`[discord] Failed to fetch events from guild ${guildName}: HTTP ${res.status}`);
      continue;
    }

    const events = await res.json();

    // Filter to MTG events only
    const mtgEvents = events.filter((ev: any) => {
      const name = (ev.name || "").toLowerCase();
      return MTG_KEYWORDS.some(kw => name.includes(kw));
    });

    console.log(`[discord] ${guildName}: ${mtgEvents.length} MTG events (of ${events.length} total)`);

    for (const ev of mtgEvents as any[]) {
      const start = new Date(ev.scheduled_start_time);
      const { title, locationHint } = parseEventName(ev.name);
      const desc = cleanDescription(ev.description);
      const coords = GUILD_COORDS[guildId];

      allEvents.push({
        id: "discord-" + ev.id,
        title,
        format: extractFormat(ev.name),
        date: start.toISOString().slice(0, 10),
        time: start.toISOString().slice(11, 16),
        timezone: "America/New_York",
        location: locationHint,
        address: coords?.address || "",
        cost: extractCost(ev.description),
        store_url: "",
        detail_url: `https://discord.com/events/${ev.guild_id}/${ev.id}`,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        source: "discord",
      });
    }
  }

  return allEvents;
}
