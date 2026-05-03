// Discord embed rendering + REST POST. The bot speaks raw v10 — no
// discord.js, no socket. Same auth pattern as scrapers/discord.ts so we don't
// fork the bot-token plumbing.

import { fromZonedTime } from "date-fns-tz";
import type { EventRow } from "./events";
import { listPostedMessagesForEvent } from "./discord-subscriptions";
import { SITE_URL } from "./config";
import {
  FORMAT_EMOJI,
  FORMAT_EMOJI_DEFAULT,
  FORMAT_EMBED_COLOR,
  FORMAT_EMBED_COLOR_DEFAULT,
  SOURCE_LABELS,
} from "./format-style";

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordEmbed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  image?: { url: string };
  footer?: { text: string };
}

export interface DiscordMessagePayload {
  content?: string;
  embeds?: DiscordEmbed[];
  /** Allow no @-pings; digest content is informational. */
  allowed_mentions?: { parse: [] };
}

/**
 * Combine an event's local date/time/timezone into a Unix epoch (seconds).
 * Used to feed Discord's `<t:UNIX:F>` syntax — Discord renders these in each
 * viewer's local timezone, which is exactly what we want for a global bot.
 *
 * Returns null when the event has no time set; caller should fall back to a
 * date-only string.
 */
function eventUnixTimestamp(event: EventRow): number | null {
  if (!event.time) return null;
  const tz = event.timezone || "America/New_York";
  try {
    const utc = fromZonedTime(`${event.date}T${event.time}:00`, tz);
    return Math.floor(utc.getTime() / 1000);
  } catch {
    return null;
  }
}

export function renderEventEmbed(event: EventRow): DiscordEmbed {
  const emoji = FORMAT_EMOJI[event.format] ?? FORMAT_EMOJI_DEFAULT;
  const color = FORMAT_EMBED_COLOR[event.format] ?? FORMAT_EMBED_COLOR_DEFAULT;
  const sourceLabel = SOURCE_LABELS[event.source] ?? event.source;

  const ts = eventUnixTimestamp(event);
  const description = ts != null
    ? `**<t:${ts}:F>** · <t:${ts}:R>`
    : `**${event.date}**`;

  const fields: NonNullable<DiscordEmbed["fields"]> = [];
  if (event.format) {
    fields.push({ name: "Format", value: event.format, inline: true });
  }
  fields.push({
    name: "Cost",
    value: event.cost && event.cost.trim() ? event.cost : "—",
    inline: true,
  });
  if (event.location) {
    const venueQuery = event.address ? `${event.location} ${event.address}` : event.location;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(venueQuery)}`;
    fields.push({
      name: "Venue",
      value: `[${event.location}](${mapsUrl})`,
      inline: true,
    });
  }

  const embed: DiscordEmbed = {
    title: `${emoji} ${event.title}`,
    url: `${SITE_URL}/event/${encodeURIComponent(event.id)}`,
    description,
    color,
    fields,
    footer: { text: `Source: ${sourceLabel}` },
  };

  if (event.image_url) {
    embed.image = { url: event.image_url };
  }

  return embed;
}

/**
 * Build digest message(s). Discord caps a single message at 10 embeds, so a
 * digest of >10 events becomes multiple sequential messages — caller posts
 * each in turn.
 */
export function renderDigestMessages(events: EventRow[], opts: {
  windowLabel: string; // "this week" / "today" / etc.
}): DiscordMessagePayload[] {
  if (events.length === 0) {
    return [{
      content: `No upcoming events ${opts.windowLabel}. Browse the full calendar → ${SITE_URL}/?utm_source=discord`,
      allowed_mentions: { parse: [] },
    }];
  }

  const chunks: EventRow[][] = [];
  for (let i = 0; i < events.length; i += 10) {
    chunks.push(events.slice(i, i + 10));
  }

  return chunks.map((chunk, idx) => ({
    content: idx === 0
      ? `📅 **${events.length} event${events.length === 1 ? "" : "s"} ${opts.windowLabel}** — view all on PlayIRL.GG → ${SITE_URL}/?utm_source=discord`
      : undefined,
    embeds: chunk.map(renderEventEmbed),
    allowed_mentions: { parse: [] },
  }));
}

export function renderReminderMessage(event: EventRow): DiscordMessagePayload {
  const ts = eventUnixTimestamp(event);
  const content = ts != null
    ? `⏰ Starting <t:${ts}:R>`
    : `⏰ Starting soon`;
  return {
    content,
    embeds: [renderEventEmbed(event)],
    allowed_mentions: { parse: [] },
  };
}

function botToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN || null;
}

export interface PostedMessage {
  id: string;
}

/**
 * POST a message to a channel using the bot token. Throws on non-2xx so the
 * dispatcher's catch can release the idempotency claim and retry next tick.
 */
export async function postToChannel(
  channelId: string,
  payload: DiscordMessagePayload,
): Promise<PostedMessage> {
  const token = botToken();
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord POST /channels/${channelId}/messages failed: ${res.status} ${body}`);
  }
  const data = await res.json() as { id: string };
  return { id: data.id };
}

/**
 * PATCH a previously-posted bot message. Used by the edit-on-cancel flow to
 * mark stale digests/reminders as cancelled. Returns true on 2xx, false on
 * any error (the message was deleted, the bot lost permission, etc.) — no
 * throw, since cancellations are best-effort fan-out.
 */
export async function patchChannelMessage(
  channelId: string,
  messageId: string,
  payload: DiscordMessagePayload,
): Promise<boolean> {
  const token = botToken();
  if (!token) return false;
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[discord-post] PATCH /channels/${channelId}/messages/${messageId} failed: ${res.status} ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[discord-post] PATCH threw:`, err);
    return false;
  }
}

/**
 * Best-effort fan-out: patch every Discord message where this bot referenced
 * the cancelled event, prefixing the content with a "cancelled" notice so
 * users in the channel see the update without a duplicate post.
 *
 * Run as fire-and-forget from the cancel route — caller doesn't wait. We
 * also rate-limit ourselves with a small inter-call gap so a heavily-shared
 * event doesn't trip Discord's per-bot global limit.
 */
export async function patchPostsForCancelledEvent(event: EventRow): Promise<{ patched: number; failed: number }> {
  const messages = listPostedMessagesForEvent(event.id);
  if (messages.length === 0) return { patched: 0, failed: 0 };

  const cancelledEmbed = renderEventEmbed(event);
  // Mark the embed as cancelled visually: gray it out and prepend the title.
  cancelledEmbed.color = 0x6b7280;
  cancelledEmbed.title = `❌ [Cancelled] ${cancelledEmbed.title?.replace(/^[^\s]+\s/, "") ?? event.title}`;

  let patched = 0;
  let failed = 0;
  for (const m of messages) {
    const content = m.kind === "reminder"
      ? `⚠️ This event was cancelled by the host.`
      : `⚠️ One of the events in this digest was cancelled — see below.`;
    const ok = await patchChannelMessage(m.channel_id, m.message_id, {
      content,
      embeds: m.kind === "reminder" ? [cancelledEmbed] : undefined,
    });
    if (ok) patched++; else failed++;
    await new Promise(r => setTimeout(r, 25));
  }
  return { patched, failed };
}
