import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listSourcesForUser } from "@/lib/user-sources";
import { botInviteUrl } from "@/lib/discord-bot";
import SubpageShell from "../_components/SubpageShell";
import SourcesList from "./SourcesList";

export const dynamic = "force-dynamic";

export default async function AccountSourcesPage() {
  const user = await requireRole(["user", "organizer", "admin"]);
  const sources = listSourcesForUser(user.id);
  const inviteUrl = botInviteUrl();

  return (
    <SubpageShell
      title="Event sources"
      description="Connect a Discord server to automatically import its scheduled events. Invite the PlayIRL bot, then pick which server you want to sync."
      maxWidth="max-w-4xl"
      actions={
        inviteUrl ? (
          <>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5865F2] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4752c4] transition inline-flex items-center gap-2"
            >
              <DiscordMark />
              Add bot
            </a>
            <Link
              href="/account/sources/pick-guild"
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
            >
              Pick a server
            </Link>
          </>
        ) : (
          <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            DISCORD_BOT_CLIENT_ID not set — ask an admin.
          </span>
        )
      }
    >
      <SourcesList sources={sources} />
    </SubpageShell>
  );
}

function DiscordMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.369A19.791 19.791 0 0 0 16.558 3c-.177.318-.384.744-.527 1.084a18.251 18.251 0 0 0-5.064 0A12.495 12.495 0 0 0 10.441 3a19.74 19.74 0 0 0-3.76 1.369C3.097 9.42 2.12 14.338 2.606 19.173a19.93 19.93 0 0 0 6.073 3.066c.49-.671.927-1.384 1.302-2.134a12.9 12.9 0 0 1-2.053-.978c.172-.127.341-.259.504-.395 3.96 1.825 8.243 1.825 12.152 0 .165.136.334.268.504.395-.655.39-1.344.72-2.056.98.375.749.812 1.462 1.302 2.133a19.897 19.897 0 0 0 6.077-3.066c.573-5.583-.978-10.46-4.093-14.805zM8.02 16.353c-1.217 0-2.22-1.129-2.22-2.513 0-1.383.98-2.513 2.22-2.513 1.245 0 2.243 1.14 2.221 2.513 0 1.384-.98 2.513-2.22 2.513zm7.96 0c-1.217 0-2.22-1.129-2.22-2.513 0-1.383.98-2.513 2.22-2.513 1.244 0 2.243 1.14 2.221 2.513 0 1.384-.977 2.513-2.22 2.513z" />
    </svg>
  );
}
