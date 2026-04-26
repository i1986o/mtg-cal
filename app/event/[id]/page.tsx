import { getEvent } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatEventTimeRange } from "@/lib/format-time";
import { resolveEventImage, hasRealEventImage } from "@/lib/event-image";
import ShareButton from "./share-button";
import Reveal from "@/app/reveal";

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
      <dd className="text-sm font-medium text-gray-900 dark:text-gray-200 break-words">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline break-all">
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

  const hero = resolveEventImage(ev);
  const heroIsRealImage = hasRealEventImage(ev);
  const heroIsPhoto = hero.fit === "cover";
  // For non-cover images, give logos less padding than generic SVG icons.
  const heroPadding = heroIsPhoto ? "" : heroIsRealImage ? "p-6" : "p-12";

  // Show an inline map on the Address row whenever the hero isn't already
  // a map — otherwise we'd render the same view twice.
  //
  // We prefer Google's official Maps Embed API when NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
  // is configured (free for the standard `place` mode, lock the key by HTTP
  // referrer in the Google Cloud Console). Falls back to OpenStreetMap's
  // public embed when the key isn't set — works without any setup, just less
  // polished. Google's old `?output=embed` URL is blocked by X-Frame-Options
  // on all origins now and can't be used.
  //
  // Important: prefer the address text when present. Some scraped events
  // (notably Discord-scraped ones) carry a guild-wide fallback lat/lng that
  // doesn't actually point at the venue, so Google geocoding the address is
  // far more reliable than blindly using the stored coordinates.
  const heroIsMap = hero.kind === "map";
  const hasCoords = ev.latitude != null && ev.longitude != null;
  const placeQuery = ev.address
    ? ev.location ? `${ev.location}, ${ev.address}` : ev.address
    : null;
  const googleEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;

  let mapEmbedSrc: string | null = null;
  if (googleEmbedKey && (placeQuery || hasCoords)) {
    const q = placeQuery ?? `${ev.latitude},${ev.longitude}`;
    mapEmbedSrc = `https://www.google.com/maps/embed/v1/place?key=${googleEmbedKey}&q=${encodeURIComponent(q)}&zoom=15`;
  } else if (hasCoords) {
    // OSM needs coords (no text-query embed). bbox is a small box (~0.5 km in
    // mid-latitudes); marker= drops the pin.
    mapEmbedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${(ev.longitude! - 0.005).toFixed(4)},${(ev.latitude! - 0.003).toFixed(4)},${(ev.longitude! + 0.005).toFixed(4)},${(ev.latitude! + 0.003).toFixed(4)}&layer=mapnik&marker=${ev.latitude},${ev.longitude}`;
  }
  const showInlineMap = !heroIsMap && Boolean(mapEmbedSrc);

  return (
    <main className="w-full max-w-2xl min-w-0 mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 anim-fade-in">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:underline">
          &larr; Back to PlayIRL.GG
        </Link>
        <ShareButton title={ev.title} url={`https://playirl.gg/event/${encodeURIComponent(ev.id)}`} />
      </div>

      <div className="bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-xl anim-fade-in-up" style={{ "--delay": "60ms" } as React.CSSProperties}>
        {/* Hero image — uploaded photo, scraped cover, venue default, or placeholder. */}
        {/* When the hero is a real photo or map (`object-cover`), no padding
            and no visible bg — the image fills edge-to-edge. When it's a
            letterboxed logo or icon, frame it with a light-gray "card" bg in
            both themes so logos with baked-in white backgrounds blend in;
            keeping a dark bg here in dark mode would frame them with a stark
            white-on-near-black halo. */}
        <div className={`relative aspect-video overflow-hidden rounded-t-xl ${heroIsPhoto ? "" : "bg-gray-50"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.url}
            alt={ev.title}
            className={`w-full h-full ${heroIsPhoto ? "object-cover" : "object-contain"} ${heroPadding}`}
          />
          {heroIsPhoto && (
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0c1220] via-transparent to-transparent pointer-events-none" />
          )}
        </div>

        {/* Header */}
        <div className="p-6 pb-4 space-y-4">
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Format</div>
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${FORMAT_COLORS[ev.format] || "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30"}`}>
              {FORMAT_EMOJI[ev.format] || "\uD83C\uDCCF"} {ev.format || "MTG"}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Event</div>
            <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white break-words">{ev.title}</h1>
          </div>
        </div>

        {/* Details table */}
        <Reveal delay={120}>
          <div className="px-6 pb-2 border-t border-gray-100 dark:border-white/8">
            <dl>
              <DetailRow label="Host" value={ev.location} href={ev.store_url || undefined} />
              <DetailRow label="Date" value={formatDate(ev.date)} />
              <DetailRow label="Time" value={formatEventTimeRange(ev.date, ev.time, ev.timezone)} />
              <DetailRow label="Cost" value={ev.cost || "Not listed"} />
              {ev.address && (
                <div className="py-3 border-b border-gray-100 dark:border-white/8 last:border-0">
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Address</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-200 break-words">
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(ev.location + " " + ev.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline break-words"
                    >
                      {ev.address}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </dd>
                  {showInlineMap && mapEmbedSrc && (
                    <iframe
                      src={mapEmbedSrc}
                      title={`Map of ${ev.location || ev.address}`}
                      className="w-full aspect-[3/2] rounded-md border border-gray-100 dark:border-white/8 mt-3"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}
                </div>
              )}
              <DetailRow label="Source" value={SOURCE_LABELS[ev.source] || ev.source} href={ev.detail_url || undefined} />
            </dl>
          </div>
        </Reveal>

        {/* Notes */}
        {ev.notes && (
          <Reveal>
            <div className="mx-6 mb-4 bg-gray-50 dark:bg-[#141c2e] rounded-lg p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{ev.notes}</p>
            </div>
          </Reveal>
        )}

        {/* Meta footer */}
        <Reveal>
          <div className="bg-gray-50 dark:bg-[#080e18] rounded-b-xl px-6 py-3 text-xs text-gray-400 dark:text-gray-600 flex justify-between">
            <span>ID: {ev.id}</span>
            <span>Added {ev.added_date} · Updated {ev.updated_date}</span>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
