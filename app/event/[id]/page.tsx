import type { Metadata } from "next";
import { getEvent } from "@/lib/events";
import { getRsvpSummary, isPastEvent } from "@/lib/event-rsvps";
import { findInviteByToken, redeemInvite } from "@/lib/event-invites";
import { getCurrentUser } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatEventTimeRange } from "@/lib/format-time";
import { resolveEventImage, hasRealEventImage } from "@/lib/event-image";
import { SITE_URL } from "@/lib/config";
import ShareButton from "./share-button";
import RsvpButton from "./rsvp-button";
import HostActions from "./host-actions";
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

function clampDescription(text: string, max = 160): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

function buildEventDescription(ev: {
  format: string;
  location: string;
  date: string;
  time: string;
  timezone: string;
  cost: string;
  notes: string;
}): string {
  // Prefer the first sentence of host-written notes when present and useful;
  // otherwise compose from the structured fields so every event still gets
  // a meaningful preview snippet.
  if (ev.notes && ev.notes.trim().length > 0) {
    const firstSentence = ev.notes.split(/(?<=[.!?])\s+/)[0] ?? ev.notes;
    return clampDescription(firstSentence);
  }
  const timeRange = formatEventTimeRange(ev.date, ev.time, ev.timezone);
  const parts = [
    ev.format && `${ev.format} MTG`,
    ev.location && `at ${ev.location}`,
    formatDate(ev.date),
    timeRange,
    ev.cost,
  ].filter(Boolean);
  return clampDescription(parts.join(" · "));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ev = getEvent(decodeURIComponent(id));
  if (!ev) return {};

  // Unlisted and private events must not leak title/notes/image into chat
  // previews. Return only a noindex hint and the bare site title.
  if (ev.visibility !== "public") {
    return {
      title: "PlayIRL.GG",
      robots: { index: false, follow: false },
    };
  }

  const titlePrefix = ev.cancelled_at ? "[Cancelled] " : "";
  const title = `${titlePrefix}${ev.title}${ev.format ? ` — ${ev.format}` : ""}`;
  const description = buildEventDescription(ev);
  const hero = resolveEventImage(ev);
  const url = `${SITE_URL}/event/${encodeURIComponent(ev.id)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: hero.url, alt: ev.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [hero.url],
    },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ev = getEvent(decodeURIComponent(id));

  if (!ev) return notFound();

  // Visibility gate. Public events are always viewable. Unlisted events are
  // viewable by anyone with the URL (no auth, no token). Private events
  // require the viewer to be either the host, an admin, an RSVP'd user, or
  // someone presenting a valid invite token.
  const viewer = await getCurrentUser();
  const signedIn = !!viewer && !viewer.suspended;

  if (ev.visibility === "private") {
    const validToken = sp.token ? findInviteByToken(sp.token) : undefined;
    const tokenGrantsThisEvent = validToken && validToken.event_id === ev.id;
    const isOwnerOrAdmin =
      signedIn && (viewer!.role === "admin" || ev.owner_id === viewer!.id);
    const hasRsvp =
      signedIn && getRsvpSummary(ev.id, viewer!.id).myStatus !== null;
    if (!isOwnerOrAdmin && !hasRsvp && !tokenGrantsThisEvent) {
      return notFound();
    }
    // Audit: record the first redeemer of a token. Doesn't invalidate the
    // token — multi-use is intentional for "post the link in Discord" cases.
    if (tokenGrantsThisEvent && signedIn) redeemInvite(sp.token!, viewer!.id);
  }

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

  // RSVP + host state. Cancellation locks RSVP changes (banner takes over
  // the action zone). Hosts get extra controls — cancel, manage invites.
  const rsvp = getRsvpSummary(ev.id, viewer?.id ?? null);
  const past = isPastEvent(ev.date);
  const cancelled = !!ev.cancelled_at;
  const rsvpEnabled = ev.rsvp_enabled === 1 && !cancelled;
  const isHost = signedIn && (viewer!.role === "admin" || ev.owner_id === viewer!.id);
  const myStatus =
    rsvp.myStatus === "going" ||
    rsvp.myStatus === "maybe" ||
    rsvp.myStatus === "waitlist"
      ? rsvp.myStatus
      : null;

  return (
    <main className="w-full max-w-2xl min-w-0 mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 anim-fade-in">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:underline">
          &larr; Back to PlayIRL.GG
        </Link>
        <div className="flex items-center gap-2">
          {rsvpEnabled && (
            <RsvpButton
              eventId={ev.id}
              signedIn={signedIn}
              pastEvent={past}
              capacity={ev.capacity}
              initialStatus={myStatus}
              initialCounts={rsvp.counts}
              initialWaitlistPosition={rsvp.waitlistPosition}
            />
          )}
          <ShareButton title={ev.title} url={`${SITE_URL}/event/${encodeURIComponent(ev.id)}`} />
        </div>
      </div>

      {cancelled && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 anim-fade-in">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            This event was cancelled by the host
            {ev.cancelled_at ? ` on ${ev.cancelled_at.slice(0, 10)}` : ""}.
          </p>
          <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-1">
            All RSVPs have been marked cancelled. The event remains visible so
            attendees can confirm what happened.
          </p>
        </div>
      )}

      {ev.visibility !== "public" && !cancelled && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-4 py-2 text-xs text-gray-600 dark:text-gray-400 anim-fade-in">
          {ev.visibility === "unlisted"
            ? "Unlisted event — anyone with this link can view, but it won't appear in the public calendar."
            : "Private event — only invited guests can view."}
        </div>
      )}

      {isHost && (
        <HostActions
          eventId={ev.id}
          cancelled={cancelled}
          visibility={ev.visibility}
        />
      )}

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
