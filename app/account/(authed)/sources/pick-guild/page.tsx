import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listBotGuilds } from "@/lib/discord-bot";
import { listEnabledDiscordSources } from "@/lib/user-sources";
import SubpageShell from "../../_components/SubpageShell";
import PickGuildForm from "./PickGuildForm";

export const dynamic = "force-dynamic";

export default async function PickGuildPage() {
  await requireRole(["user", "organizer", "admin"]);

  const [guilds, claimed] = await Promise.all([
    listBotGuilds(),
    Promise.resolve(listEnabledDiscordSources()),
  ]);
  const claimedIds = new Set(claimed.map((s) => s.external_id));
  const unclaimed = guilds.filter((g) => !claimedIds.has(g.id));

  return (
    <SubpageShell
      title="Pick a Discord server"
      description={
        <>
          These are the servers the PlayIRL bot is currently a member of. Pick the one you want to connect.
          If yours isn't listed, the bot hasn't joined yet —{" "}
          <Link href="/account/sources" className="text-blue-600 dark:text-blue-400 hover:underline">
            go back and invite it
          </Link>.
        </>
      }
    >
      {guilds.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          The bot isn't in any servers yet. Invite it first, then come back here.
        </div>
      ) : unclaimed.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Every server the bot is in is already connected by someone. If yours is listed,{" "}
          <Link href="/account/sources" className="text-blue-600 dark:text-blue-400 hover:underline">
            manage it here
          </Link>.
        </div>
      ) : (
        <PickGuildForm guilds={unclaimed} />
      )}
    </SubpageShell>
  );
}
