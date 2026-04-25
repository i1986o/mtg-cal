import { cache } from "react";
import { listVenueDefaults, venueKey } from "./venues";

/**
 * Resolves an event's display image through a four-step fallback chain:
 *
 *   event.image_url                          (uploaded by host or scraped from Discord)
 *     → venue_defaults[venueKey(location)]   (admin-set default for this venue)
 *     → SOURCE_FALLBACKS[event.source_type]  (generic per-source image)
 *     → /images/event-placeholder.svg        (universal fallback)
 *
 * The venue_defaults table is small and read-only at render time, so we cache
 * a single Map<key, url> per request via React's `cache()`.
 */

const SOURCE_FALLBACKS: Record<string, string> = {
  "user-discord": "/images/source-discord.svg",
  scraper: "/images/source-scraper.svg",
};

const PLACEHOLDER = "/images/event-placeholder.svg";

const venueDefaultsByKey = cache((): Map<string, string> => {
  const out = new Map<string, string>();
  for (const row of listVenueDefaults()) {
    out.set(row.venue_key, row.image_url);
  }
  return out;
});

export interface EventImageInput {
  image_url?: string | null;
  location?: string | null;
  source_type?: string | null;
}

export function resolveEventImage(event: EventImageInput): string {
  if (event.image_url) return event.image_url;
  const defaults = venueDefaultsByKey();
  const fromVenue = defaults.get(venueKey(event.location ?? ""));
  if (fromVenue) return fromVenue;
  const fromSource = SOURCE_FALLBACKS[event.source_type ?? ""];
  if (fromSource) return fromSource;
  return PLACEHOLDER;
}

/** True when the resolved image is a real photo (uploaded or scraped), not a placeholder. */
export function hasRealEventImage(event: EventImageInput): boolean {
  if (event.image_url) return true;
  const defaults = venueDefaultsByKey();
  return defaults.has(venueKey(event.location ?? ""));
}
