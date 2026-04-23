import EventForm from "../../../../admin/_components/EventForm";

export default function NewOrganizerEventPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 mb-2">
        New event
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Fill in the details. Your event goes live immediately and shows up on the public calendar.
      </p>
      <EventForm
        endpoint="/api/organizer/events"
        method="POST"
        redirectTo="/organizer/events"
        showStatus={false}
      />
    </div>
  );
}
