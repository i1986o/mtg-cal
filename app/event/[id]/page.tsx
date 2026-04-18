import { getEvent } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";

const FORMAT_COLORS: Record<string, string> = {
  Commander: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Modern: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Standard: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Pioneer: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Legacy: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Pauper: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Draft: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  Sealed: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const SOURCE_LABELS: Record<string, string> = {
  "wizards-locator": "Wizards of the Coast Event Locator",
  "discord": "Discord Scheduled Event",
  "topdeck": "TopDeck.gg",
};

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-28">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            {value}
          </a>
        ) : value}
      </dd>
    </div>
  );
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = getEvent(decodeURIComponent(id));

  if (!ev) return notFound();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block">
        &larr; Back to events
      </Link>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${FORMAT_COLORS[ev.format] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
              {ev.format || "MTG"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ev.title}</h1>
          {ev.location && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{ev.location}</p>
          )}
        </div>

        {/* Details table */}
        <div className="px-6 pb-2">
          <dl>
            <DetailRow label="Date" value={formatDate(ev.date)} />
            <DetailRow label="Time" value={ev.time ? `${formatTime(ev.time)} UTC` : ""} />
            <DetailRow label="Duration" value="3 hours (estimated)" />
            <DetailRow label="Format" value={ev.format} />
            <DetailRow label="Cost" value={ev.cost || "Not listed"} />
            <DetailRow label="Store" value={ev.location} href={ev.store_url || undefined} />
            <DetailRow label="Address" value={ev.address} href={ev.address ? `https://maps.google.com/?q=${encodeURIComponent(ev.address)}` : undefined} />
            <DetailRow label="Source" value={SOURCE_LABELS[ev.source] || ev.source} />
          </dl>
        </div>

        {/* Notes */}
        {ev.notes && (
          <div className="mx-6 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ev.notes}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6 pt-2 flex flex-wrap gap-3">
          {ev.detail_url && (
            <a href={ev.detail_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Event Details
            </a>
          )}
          {ev.store_url && (
            <a href={ev.store_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
              Store Website
            </a>
          )}
          {ev.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              Open in Maps
            </a>
          )}
        </div>

        {/* Meta footer */}
        <div className="bg-gray-50 dark:bg-gray-950 px-6 py-3 text-xs text-gray-400 dark:text-gray-500 flex justify-between">
          <span>ID: {ev.id}</span>
          <span>Added {ev.added_date} · Updated {ev.updated_date}</span>
        </div>
      </div>
    </main>
  );
}
