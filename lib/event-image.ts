import { cache } from "react";
import { listVenueDefaults, venueKey, type VenueImageSource } from "./venues";
import { uploadFileExists } from "./upload-storage";

/** True when the URL is a `/uploads/*` path whose underlying file is missing
 *  on disk. Remote URLs and SVG fallbacks always pass. Lets the cascade skip
 *  past dead rows (Railway volume reset, stale committed DB) instead of
 *  rendering a broken `<img>`. */
function isLiveImageUrl(url: string): boolean {
  if (!url.startsWith("/uploads/")) return true;
  return uploadFileExists(url);
}

/**
 * Resolves an event's display image plus an "object-fit" hint, through a
 * five-step fallback chain:
 *
 *   event.image_url                          (uploaded by host or scraped from Discord)
 *     → venue_defaults[venueKey(location)]   (real venue photo: manual upload or auto-fetched
 *                                             og:image / Places photo / Street View)
 *     → mapboxStaticUrl(lat, lng)            (render-time map composed inline; works for any
 *                                             event with coords, no DB row required)
 *     → SOURCE_FALLBACKS[event.source_type]  (generic per-source SVG icon)
 *     → /images/event-placeholder.svg        (universal SVG fallback)
 *
 * The "fit" hint tells the renderer whether to crop-fill the box (`cover` —
 * good for photos and maps) or letterbox the whole image (`contain` — needed
 * for logos and SVG icons that get mangled by cropping).
 *
 * The venue_defaults table is small and read-only at render time, so we cache
 * a single Map per request via React's `cache()`. Empty `image_url` values
 * represent failed auto-fetch attempts and are skipped — they exist only so
 * the auto-fetcher can remember it tried.
 */

const SOURCE_FALLBACKS: Record<string, string> = {
  "user-discord": "/images/source-discord.svg",
  scraper: "/images/source-scraper.svg",
};

const PLACEHOLDER = "/images/event-placeholder.svg";

export type ImageFit = "cover" | "contain";

/** Where the resolved image came from in the cascade. Lets callers decide,
 *  e.g., whether to render a *separate* map alongside (skip when the hero is
 *  already a map) or pad differently for icons. */
export type ImageKind = "event" | "venue" | "map" | "fallback";

interface VenueDefaultEntry {
  url: string;
  source: VenueImageSource | null;
}

const venueDefaultsByKey = cache((): Map<string, VenueDefaultEntry> => {
  const out = new Map<string, VenueDefaultEntry>();
  for (const row of listVenueDefaults()) {
    if (row.image_url && isLiveImageUrl(row.image_url)) {
      out.set(row.venue_key, { url: row.image_url, source: row.image_source });
    }
  }
  return out;
});

/**
 * Compose a Mapbox Static Images URL for a given coordinate pair. Returns null
 * when the public token isn't configured — callers should treat that as "skip
 * this layer" and fall through to the next one.
 */
export function mapboxStaticUrl(lat: number, lng: number): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const marker = `pin-s+1e40af(${lng},${lat})`;
  const center = `${lng},${lat},15,0`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${marker}/${center}/600x300@2x?access_token=${token}`;
}

export interface EventImageInput {
  image_url?: string | null;
  location?: string | null;
  source_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface EventImage {
  url: string;
  /** How to fit the image in its container. `cover` crops to fill (good for
   *  photos and maps); `contain` letterboxes (good for logos and SVG icons). */
  fit: ImageFit;
  /** Which cascade tier produced this URL. */
  kind: ImageKind;
}

/** Heuristic — would `object-cover` crop this image's recognizability? */
function fitFor(url: string, venueSource: VenueImageSource | null | undefined): ImageFit {
  // SVG fallbacks are icon-style; never crop.
  if (url.endsWith(".svg")) return "contain";
  // og:image scrapes are *frequently* logos pulled from <meta og:image> on
  // store websites — those need the whole thing visible. Real photos
  // (Places / Street View / manual upload) and Mapbox maps look better
  // cropped to fill.
  if (venueSource === "og_scrape") return "contain";
  return "cover";
}

export function resolveEventImage(event: EventImageInput): EventImage {
  // 1. Per-event image (Discord CDN, host upload). Photo by convention.
  if (event.image_url && isLiveImageUrl(event.image_url)) {
    return { url: event.image_url, fit: fitFor(event.image_url, null), kind: "event" };
  }

  // 2. Venue-default photo (admin-uploaded or auto-fetched).
  const venue = venueDefaultsByKey().get(venueKey(event.location ?? ""));
  if (venue) {
    return { url: venue.url, fit: fitFor(venue.url, venue.source), kind: "venue" };
  }

  // 3. Render-time inline Mapbox map.
  if (event.latitude != null && event.longitude != null) {
    const map = mapboxStaticUrl(event.latitude, event.longitude);
    if (map) return { url: map, fit: "cover", kind: "map" };
  }

  // 4. Source-type icon (SVG).
  const fromSource = SOURCE_FALLBACKS[event.source_type ?? ""];
  if (fromSource) return { url: fromSource, fit: "contain", kind: "fallback" };

  // 5. Universal placeholder (SVG).
  return { url: PLACEHOLDER, fit: "contain", kind: "fallback" };
}

/**
 * True when the resolved image is a real photo or a real map (not a generic
 * source-type icon or the universal placeholder). Used by detail-page layout
 * code that wants to know whether to render a hero crop vs. an icon-style tile.
 */
export function hasRealEventImage(event: EventImageInput): boolean {
  if (event.image_url && isLiveImageUrl(event.image_url)) return true;
  if (venueDefaultsByKey().has(venueKey(event.location ?? ""))) return true;
  if (event.latitude != null && event.longitude != null && process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return true;
  }
  return false;
}
