import Link from "next/link";
import { requireRole } from "@/lib/session";
import SubpageShell from "../_components/SubpageShell";
import MyEventsList from "./MyEventsList";

export const dynamic = "force-dynamic";

export default async function AccountEventsPage() {
  await requireRole(["user", "organizer", "admin"]);
  return (
    <SubpageShell
      title="My events"
      description="Events you've submitted or imported from your Discord sources."
      maxWidth="max-w-4xl"
      actions={
        <Link
          href="/account/events/new"
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
        >
          + Submit event
        </Link>
      }
    >
      <MyEventsList />
    </SubpageShell>
  );
}
