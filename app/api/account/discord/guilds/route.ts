// List the signed-in user's manageable Discord servers, intersected with
// servers the bot is also a member of. Anything that ends up in the response
// is a server the user can configure a subscription for.

import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { listUserManageableGuilds } from "@/lib/discord-account";
import { listBotGuilds } from "@/lib/discord-bot";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userGuilds;
  try {
    userGuilds = await listUserManageableGuilds(user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "MISSING_GUILDS_SCOPE" || msg === "DISCORD_TOKEN_EXPIRED") {
      // Caller surfaces "please sign in with Discord again" with a button.
      return NextResponse.json({ error: msg, reauth: true }, { status: 200 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const botGuilds = await listBotGuilds();
  const botGuildIds = new Set(botGuilds.map(g => g.id));

  const result = userGuilds.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon
      ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith("a_") ? "gif" : "png"}?size=64`
      : null,
    bot_present: botGuildIds.has(g.id),
  }));
  return NextResponse.json({ guilds: result });
}
