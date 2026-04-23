import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/events";
import { requireRole } from "@/lib/session";
import EventForm from "../../../../../admin/_components/EventForm";

export const dynamic = "force-dynamic";

export default async function OrganizerEditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["organizer", "admin"]);
  const { id } = await params;
  const event = getEvent(id);
  if (!event) notFound();
  if (user.role !== "admin" && event.owner_id !== user.id) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
          Edit event
        </h1>
        <Link href="/organizer/events" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to my events
        </Link>
      </div>
      <EventForm
        endpoint={`/api/organizer/events/${encodeURIComponent(event.id)}`}
        method="PATCH"
        redirectTo="/organizer/events"
        showStatus={false}
        initial={{
          title: event.title,
          format: event.format,
          date: event.date,
          time: event.time,
          timezone: event.timezone,
          location: event.location,
          address: event.address,
          cost: event.cost,
          store_url: event.store_url,
          detail_url: event.detail_url,
          latitude: event.latitude != null ? String(event.latitude) : "",
          longitude: event.longitude != null ? String(event.longitude) : "",
          status: event.status,
          notes: event.notes,
        }}
      />
    </div>
  );
}
