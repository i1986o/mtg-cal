import { getCurrentUser } from "@/lib/session";
import EventForm from "../../../../admin/_components/EventForm";

export const dynamic = "force-dynamic";

export default async function NewAccountEventPage() {
  const user = await getCurrentUser();
  const publishesImmediately = user?.role === "organizer" || user?.role === "admin";

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 mb-2">
        New event
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {publishesImmediately
          ? "Fill in the details. Your event goes live immediately and shows up on the public calendar."
          : "Fill in the details. Your event will be reviewed by an admin before it appears on the public calendar."}
      </p>
      <EventForm
        endpoint="/api/account/events"
        method="POST"
        redirectTo="/account/events"
        showStatus={false}
      />
    </div>
  );
}
