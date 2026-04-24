// Small wrapper around Discord's REST API for the MTG Cal bot itself
// (as opposed to per-user OAuth calls).

const DISCORD_API = "https://discord.com/api/v10";

export interface BotGuild {
  id: string;
  name: string;
  icon: string | null;
}

function botToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN || null;
}

export function botClientId(): string | null {
  return process.env.DISCORD_BOT_CLIENT_ID || null;
}

export function botInviteUrl(state?: string): string | null {
  const id = botClientId();
  if (!id) return null;
  const params = new URLSearchParams({
    client_id: id,
    scope: "bot applications.commands",
    permissions: "0",
  });
  if (state) params.set("state", state);
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/** Returns every guild the bot is currently a member of (paginated). */
export async function listBotGuilds(): Promise<BotGuild[]> {
  const token = botToken();
  if (!token) return [];
  const out: BotGuild[] = [];
  let after: string | undefined;
  // Discord paginates at 200 guilds max per page.
  for (let i = 0; i < 10; i++) {
    const url = new URL(`${DISCORD_API}/users/@me/guilds`);
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
    if (!res.ok) break;
    const page = (await res.json()) as BotGuild[];
    out.push(...page);
    if (page.length < 200) break;
    after = page[page.length - 1].id;
  }
  return out;
}
