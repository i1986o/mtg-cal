// User-side Discord API helpers. Where lib/discord-bot.ts uses the BOT token
// (for things only the bot can do — fetch its own guild list, post messages,
// patch its own messages), this file uses the USER's OAuth access_token to
// call Discord on the signed-in PlayIRL user's behalf.
//
// Auth.js persists every OAuth provider's access_token in the `accounts`
// table on first sign-in (lib/auth-adapter.ts:linkAccount). When the user
// re-auths, the row updates. We only need read access to the user's guild
// list, so token refresh isn't critical — if the token has expired we
// surface "please sign in with Discord again" rather than running a refresh
// flow.

import { getDb } from "./db";

const DISCORD_API = "https://discord.com/api/v10";
const PERMISSION_MANAGE_GUILD = BigInt(0x20);

export interface DiscordAccount {
  user_id: string;
  provider_account_id: string;
  access_token: string | null;
  expires_at: number | null;
  scope: string | null;
}

export function getDiscordAccountForUser(userId: string): DiscordAccount | null {
  const row = getDb().prepare(`
    SELECT user_id, provider_account_id, access_token, expires_at, scope
      FROM accounts
     WHERE user_id = ? AND provider = 'discord'
     LIMIT 1
  `).get(userId) as DiscordAccount | undefined;
  return row ?? null;
}

export interface DiscordGuildSummary {
  id: string;
  name: string;
  icon: string | null;
  /** Bitfield as decimal string. Discord returns this for the user's role union. */
  permissions: string;
}

// Per-user cache for /users/@me/guilds so rapid form re-opens (or both the
// guilds + channels endpoints firing back-to-back during one form session)
// don't burn through Discord's per-route rate limit. The endpoint allows
// roughly 1 req per 5 seconds per user — short cache here is plenty.
const GUILDS_CACHE_TTL_MS = 60_000;
const guildsCache = new Map<string, { fetchedAt: number; guilds: DiscordGuildSummary[] }>();

async function fetchGuildsWithRetry(accessToken: string): Promise<DiscordGuildSummary[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 401) throw new Error("DISCORD_TOKEN_EXPIRED");
    if (res.status === 429) {
      // Discord puts the wait in either the body's `retry_after` (seconds,
      // float) or the X-RateLimit-Reset-After header. Trust whichever is
      // bigger so we don't immediately re-spam.
      const body = await res.json().catch(() => ({}));
      const headerSec = parseFloat(res.headers.get("X-RateLimit-Reset-After") ?? "0");
      const bodySec = typeof (body as { retry_after?: number }).retry_after === "number"
        ? (body as { retry_after: number }).retry_after
        : 0;
      const waitMs = Math.max(headerSec, bodySec, 0.25) * 1000 + 50;
      console.warn(`[discord-account] 429 from /users/@me/guilds; sleeping ${waitMs}ms (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Discord /users/@me/guilds failed: ${res.status} ${body}`);
    }
    return await res.json() as DiscordGuildSummary[];
  }
  throw new Error("Discord /users/@me/guilds: rate-limited after retries");
}

/**
 * Call Discord's /users/@me/guilds with the user's stored access_token. Filter
 * to guilds where they hold MANAGE_GUILD permission (so we don't offer to
 * configure a bot subscription in a server they can't actually administer).
 *
 * Throws on 401 (token expired/revoked) so the caller can prompt re-auth.
 * Returns [] on missing scope (`guilds` was never granted).
 *
 * Result is cached per user for 60 seconds — Discord's per-route limit on
 * this endpoint is tight, and consecutive guild-then-channels calls during
 * the "Add subscription" form would otherwise hit it routinely.
 */
export async function listUserManageableGuilds(userId: string): Promise<DiscordGuildSummary[]> {
  const cached = guildsCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < GUILDS_CACHE_TTL_MS) {
    return cached.guilds;
  }

  const account = getDiscordAccountForUser(userId);
  if (!account?.access_token) return [];
  if (account.scope && !account.scope.split(/\s+/).includes("guilds")) {
    // Scope was never granted — caller should prompt re-auth.
    throw new Error("MISSING_GUILDS_SCOPE");
  }

  const guilds = await fetchGuildsWithRetry(account.access_token);
  const filtered = guilds.filter(g => {
    try {
      const bits = BigInt(g.permissions);
      return (bits & PERMISSION_MANAGE_GUILD) === PERMISSION_MANAGE_GUILD;
    } catch {
      return false;
    }
  });
  guildsCache.set(userId, { fetchedAt: Date.now(), guilds: filtered });
  return filtered;
}

/** Wipe the cached guild list for a user. Called when subscriptions are
 *  created/edited so a follow-up POST sees fresh data. */
export function invalidateGuildsCache(userId: string): void {
  guildsCache.delete(userId);
}
