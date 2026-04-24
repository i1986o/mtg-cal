import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { createUserSource, isGuildClaimed } from "@/lib/user-sources";
import { listBotGuilds } from "@/lib/discord-bot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    guild_id?: string;
    label?: string;
    venue_name?: string;
    venue_address?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  if (!body.guild_id || !body.label) {
    return NextResponse.json({ error: "guild_id and label are required" }, { status: 400 });
  }

  if (isGuildClaimed(body.guild_id)) {
    return NextResponse.json({ error: "This server is already connected by another user." }, { status: 409 });
  }

  // Verify the bot actually shares the guild — prevents spoofed guild IDs.
  const botGuilds = await listBotGuilds();
  const match = botGuilds.find((g) => g.id === body.guild_id);
  if (!match) {
    return NextResponse.json(
      { error: "The PlayIRL bot isn't in that server. Invite it first." },
      { status: 400 },
    );
  }

  const source = createUserSource({
    user_id: user.id,
    kind: "discord",
    external_id: body.guild_id,
    label: body.label,
    venue_name: body.venue_name ?? "",
    venue_address: body.venue_address ?? "",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
  });

  return NextResponse.json({ ok: true, source });
}
