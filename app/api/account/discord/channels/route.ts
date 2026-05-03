// List text channels in a given guild. Auth: the user must hold MANAGE_GUILD
// in that guild — we re-check via /users/@me/guilds rather than trusting the
// guild_id query param in isolation, otherwise anyone could enumerate the
// channels of any guild the bot is in.

import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { listUserManageableGuilds } from "@/lib/discord-account";
import { listGuildTextChannels } from "@/lib/discord-bot";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const guildId = url.searchParams.get("guild_id");
  if (!guildId) {
    return NextResponse.json({ error: "guild_id is required" }, { status: 400 });
  }

  try {
    const userGuilds = await listUserManageableGuilds(user.id);
    if (!userGuilds.some(g => g.id === guildId)) {
      // Hide existence — same shape as authorize() in the [id] route.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "MISSING_GUILDS_SCOPE" || msg === "DISCORD_TOKEN_EXPIRED") {
      return NextResponse.json({ error: msg, reauth: true }, { status: 200 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    const channels = await listGuildTextChannels(guildId);
    return NextResponse.json({
      channels: channels.map(c => ({ id: c.id, name: c.name })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
