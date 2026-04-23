import EventForm from "../../../_components/EventForm";

export default function NewEventPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 mb-6">
        New event
      </h1>
      <EventForm
        endpoint="/api/admin/events"
        method="POST"
        redirectTo="/admin/events"
      />
    </div>
  );
}
