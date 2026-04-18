import { getEvent } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";

const FORMAT_COLORS: Record<string, string> = {
  Commander: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  Modern: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  Standard: "bg-green-500/20 text-green-300 border border-green-500/30",
  Pioneer: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  Legacy: "bg-red-500/20 text-red-300 border border-red-500/30",
  Pauper: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  Draft: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  Sealed: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
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
    <div className="flex justify-between items-baseline py-3 border-b border-[#1c2333] last:border-0">
      <dt className="text-sm text-gray-500 shrink-0 w-28">{label}</dt>
      <dd className="text-sm font-medium text-gray-200 text-right">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-400 hover:underline">
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
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 hover:text-white hover:underline mb-6 inline-block">
        &larr; Back to events
      </Link>

      <div className="bg-[#0d1117] border border-[#1c2333] rounded-xl overflow-hidden">
        {/* Map header */}
        {ev.latitude && ev.longitude && (
          <div className="relative h-48 overflow-hidden bg-[#131a2b]">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${ev.longitude-0.008},${ev.latitude-0.004},${ev.longitude+0.008},${ev.latitude+0.004}&layer=mapnik&marker=${ev.latitude},${ev.longitude}`}
              className="w-full h-full border-0 pointer-events-none"
              style={{ filter: "brightness(0.7) saturate(0.5)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent pointer-events-none" />
            <a
              href={`https://maps.google.com/?q=${ev.latitude},${ev.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10"
            />
          </div>
        )}

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${FORMAT_COLORS[ev.format] || "bg-gray-500/20 text-gray-300 border border-gray-500/30"}`}>
              {FORMAT_EMOJI[ev.format] || "\uD83C\uDCCF"} {ev.format || "MTG"}
            </span>
          </div>
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-white">{ev.title}</h1>
          {ev.location && (
            <p className="text-gray-400 mt-1">{"\uD83D\uDCCD"} {ev.location}</p>
          )}
        </div>

        {/* Details table */}
        <div className="px-6 pb-2">
          <dl>
            <DetailRow label="Date" value={formatDate(ev.date)} />
            <DetailRow label="Time" value={ev.time ? `${formatTime(ev.time)} \u2013 ${formatTime((() => { const [h,m] = ev.time.split(":").map(Number); return `${(h+3)%24}:${String(m).padStart(2,"0")}`; })())} UTC` : ""} />
            <DetailRow label="Format" value={ev.format} />
            <DetailRow label="Cost" value={ev.cost || "Not listed"} />
            <DetailRow label="Store" value={ev.location} href={ev.store_url || undefined} />
            <DetailRow label="Address" value={ev.address} href={ev.address ? `https://maps.google.com/?q=${encodeURIComponent(ev.address)}` : undefined} />
            <DetailRow label="Source" value={SOURCE_LABELS[ev.source] || ev.source} href={ev.detail_url || undefined} />
          </dl>
        </div>

        {/* Notes */}
        {ev.notes && (
          <div className="mx-6 mb-4 bg-[#131a2b] rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{ev.notes}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6 pt-2 flex flex-wrap gap-3">
          {ev.store_url && (
            <a href={ev.store_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d1117] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#131a2b] transition border border-[#1c2333]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
              Store Website
            </a>
          )}
          {ev.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d1117] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#131a2b] transition border border-[#1c2333]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              Open in Maps
            </a>
          )}
        </div>

        {/* Meta footer */}
        <div className="bg-[#0a0e14] px-6 py-3 text-xs text-gray-600 flex justify-between">
          <span>ID: {ev.id}</span>
          <span>Added {ev.added_date} · Updated {ev.updated_date}</span>
        </div>
      </div>
    </main>
  );
}
