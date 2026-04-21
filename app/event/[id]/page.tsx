import { getEvent } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatEventTimeRange } from "@/lib/format-time";
import ShareButton from "./share-button";

const FORMAT_COLORS: Record<string, string> = {
  Commander: "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
  Modern: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  Standard: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
  Pioneer: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30",
  Legacy: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
  Pauper: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30",
  Draft: "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30",
  Sealed: "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30",
};

const FORMAT_EMOJI: Record<string, string> = {
  Commander: "\u2694\uFE0F",
  Modern: "\u26A1",
  Standard: "\u2B50",
  Pioneer: "\uD83E\uDE90",
  Legacy: "\uD83D\uDC51",
  Pauper: "\uD83E\uDE99",
  Draft: "\uD83C\uDFB2",
  Sealed: "\uD83C\uDF81",
};

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
    <div className="py-3 border-b border-gray-100 dark:border-white/8 last:border-0">
      <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-gray-200">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline">
            {value}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
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
    <main className="max-w-[52.5rem] mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:underline mb-6 inline-block">
        &larr; Back to PlayIRL.GG
      </Link>

      <div className="bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-xl">
        {/* Map header — Google Maps embed */}
        {ev.location && (
          <div className="relative h-48 overflow-hidden rounded-t-xl">
            <iframe
              src={`https://www.google.com/maps?q=${encodeURIComponent(ev.location + (ev.address ? " " + ev.address : ""))}&output=embed&z=15`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0c1220] via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 right-3 z-10">
              <ShareButton title={ev.title} url={`https://playirl.gg/event/${encodeURIComponent(ev.id)}`} />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${FORMAT_COLORS[ev.format] || "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30"}`}>
              {FORMAT_EMOJI[ev.format] || "\uD83C\uDCCF"} {ev.format || "MTG"}
            </span>
          </div>
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white">{ev.title}</h1>
        </div>

        {/* Details table */}
        <div className="px-6 pb-2 border-t border-gray-100 dark:border-white/8">
          <dl>
            <DetailRow label="Host" value={ev.location} href={ev.store_url || undefined} />
            <DetailRow label="Date" value={formatDate(ev.date)} />
            <DetailRow label="Time" value={formatEventTimeRange(ev.date, ev.time, ev.timezone)} />
            <DetailRow label="Format" value={ev.format} />
            <DetailRow label="Cost" value={ev.cost || "Not listed"} />
            <DetailRow label="Address" value={ev.address} href={ev.address ? `https://www.google.com/maps/search/${encodeURIComponent(ev.location + " " + ev.address)}` : undefined} />
            <DetailRow label="Source" value={SOURCE_LABELS[ev.source] || ev.source} href={ev.detail_url || undefined} />
          </dl>
        </div>

        {/* Notes */}
        {ev.notes && (
          <div className="mx-6 mb-4 bg-gray-50 dark:bg-[#141c2e] rounded-lg p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ev.notes}</p>
          </div>
        )}

        {/* Meta footer */}
        <div className="bg-gray-50 dark:bg-[#080e18] rounded-b-xl px-6 py-3 text-xs text-gray-400 dark:text-gray-600 flex justify-between">
          <span>ID: {ev.id}</span>
          <span>Added {ev.added_date} · Updated {ev.updated_date}</span>
        </div>
      </div>
    </main>
  );
}
