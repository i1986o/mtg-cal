import { saveUpload, type UploadBucket } from "./upload-storage";
import { setVenueDefault, type VenueImageSource } from "./venues";

/**
 * Per-venue image auto-fetcher. Tries increasingly aggressive sources for a
 * *real photo* of the venue, downloads the result to data/uploads/venues, and
 * pins it in venue_defaults so render-time can use it via the existing
 * `lib/event-image.ts` cascade. Render-time falls back to a Google Maps Static
 * image for any venue this fetcher can't find a photo for, so we deliberately
 * do NOT include a static-map tier here — it would just compete with the
 * inline layer.
 *
 * Cascade:
 *   1. tryOgScrape(store_url || detail_url) — pull <meta og:image> / twitter:image
 *   2. tryPlacesPhoto(name, address)        — Google Places API (New) "places:searchText" + photo
 *   3. tryStreetView(lat, lng)              — Google Street View Static + metadata pre-check
 *   → null if everything failed
 *
 * Tiers 2 and 3 share GOOGLE_PLACES_API_KEY. Tier 1 needs no key.
 *
 * Caller convention: `persist: false` returns the result without writing to
 * the DB or disk — useful for the backfill script's `--dry-run` flag.
 */

const MIN_IMAGE_BYTES = 5 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // matches saveUpload's MAX_UPLOAD_BYTES
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "PlayIRL.GG-VenueImageFetcher/1.0 (+https://playirl.gg)";

export type VenueImageInput = {
  name: string;
  address?: string;
  store_url?: string;
  detail_url?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type VenueImageOutcome =
  | { source: Exclude<VenueImageSource, "manual">; imageUrl: string }
  | { source: "none"; imageUrl: "" };

export interface FetchVenueImageOptions {
  /** When false, skip the persist step (no DB write, no disk write). Default true. */
  persist?: boolean;
}

/** Race a promise against a timeout, returning null on timeout/abort. */
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchBytes(url: string, headers?: Record<string, string>): Promise<Uint8Array | null> {
  const result = await withTimeout(
    fetch(url, { headers: { "user-agent": USER_AGENT, ...headers } }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      return buf;
    }),
    FETCH_TIMEOUT_MS,
  );
  if (!result) return null;
  if (result.byteLength < MIN_IMAGE_BYTES || result.byteLength > MAX_IMAGE_BYTES) return null;
  return result;
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string | null> {
  return withTimeout(
    fetch(url, { headers: { "user-agent": USER_AGENT, ...headers } }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    }),
    FETCH_TIMEOUT_MS,
  );
}

/** Pull og:image / twitter:image / itemprop=image from raw HTML. Returns the first
 *  absolute URL found, or null. We use a regex (not cheerio) to avoid a new dep. */
export function extractMetaImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      try {
        return new URL(m[1], baseUrl).toString();
      } catch {
        /* invalid URL — keep searching */
      }
    }
  }
  return null;
}

async function tryOgScrape(pageUrl: string | undefined): Promise<Uint8Array | null> {
  if (!pageUrl) return null;
  let html: string | null;
  try {
    html = await fetchText(pageUrl);
  } catch {
    return null;
  }
  if (!html) return null;
  const imgUrl = extractMetaImage(html, pageUrl);
  if (!imgUrl) return null;
  return fetchBytes(imgUrl);
}

async function tryPlacesPhoto(input: VenueImageInput): Promise<Uint8Array | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const query = [input.name, input.address].filter(Boolean).join(", ");
  if (!query) return null;

  // 1. Search for the place
  const searchRes = await withTimeout(
    fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
        "x-goog-fieldmask": "places.id,places.photos",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    }).then((r) => (r.ok ? r.json() : null)),
    FETCH_TIMEOUT_MS,
  ) as { places?: Array<{ id?: string; photos?: Array<{ name?: string }> }> } | null;
  const photoName = searchRes?.places?.[0]?.photos?.[0]?.name;
  if (!photoName) return null;

  // 2. Resolve to an image. Note: photo `name` is already in the form
  // "places/<placeId>/photos/<photoId>" — we just append `/media`.
  const photoUrl =
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1024&key=${key}&skipHttpRedirect=false`;
  return fetchBytes(photoUrl);
}

async function tryStreetView(input: VenueImageInput): Promise<Uint8Array | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const { latitude: lat, longitude: lng } = input;
  if (lat == null || lng == null) return null;

  // Pre-check: does Google have imagery at this location? Free metadata call.
  const meta = await withTimeout(
    fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${key}`,
    ).then((r) => (r.ok ? r.json() : null)),
    FETCH_TIMEOUT_MS,
  ) as { status?: string } | null;
  if (meta?.status !== "OK") return null;

  return fetchBytes(
    `https://maps.googleapis.com/maps/api/streetview?size=1024x576&location=${lat},${lng}&fov=80&key=${key}`,
  );
}

interface SaveResult {
  url: string;
}

async function saveBytes(
  bucket: UploadBucket,
  bytes: Uint8Array,
  mimeHint: string,
): Promise<SaveResult> {
  // Wrap bytes in a File so we reuse saveUpload's magic-byte sniffing & sizing.
  // `File` is a Node 20+ global in the Next.js server runtime.
  // Copy into a fresh ArrayBuffer-backed Uint8Array — TS rejects passing the
  // raw `Uint8Array<ArrayBufferLike>` from `fetch` directly to the File ctor.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const file = new File([copy], `auto.${mimeHint.split("/")[1] || "bin"}`, { type: mimeHint });
  const saved = await saveUpload(bucket, file);
  return { url: saved.url };
}

/**
 * Run the cascade. Stops at the first successful tier. When `persist` is true
 * (default), writes the resulting image to disk and updates `venue_defaults`.
 * On total failure, *still* records an attempt in venue_defaults (image_url='')
 * so the skip-logic in the scraper hook can rate-limit retries.
 */
export async function fetchVenueImage(
  input: VenueImageInput,
  options: FetchVenueImageOptions = {},
): Promise<VenueImageOutcome> {
  const { persist = true } = options;

  const tiers: Array<{
    source: Exclude<VenueImageSource, "manual">;
    run: () => Promise<Uint8Array | null>;
    mime: string;
  }> = [
    { source: "og_scrape", run: () => tryOgScrape(input.store_url || input.detail_url), mime: "image/jpeg" },
    { source: "places", run: () => tryPlacesPhoto(input), mime: "image/jpeg" },
    { source: "street_view", run: () => tryStreetView(input), mime: "image/jpeg" },
  ];

  for (const tier of tiers) {
    let bytes: Uint8Array | null = null;
    try {
      bytes = await tier.run();
    } catch (err) {
      console.warn(`[venue-image] tier=${tier.source} threw for "${input.name}":`, err);
      continue;
    }
    if (!bytes) continue;
    if (!persist) return { source: tier.source, imageUrl: "(dry-run)" };
    try {
      const saved = await saveBytes("venues", bytes, tier.mime);
      setVenueDefault(input.name, saved.url, tier.source);
      return { source: tier.source, imageUrl: saved.url };
    } catch (err) {
      console.warn(`[venue-image] persist failed tier=${tier.source} venue="${input.name}":`, err);
      continue; // try next tier
    }
  }

  // All tiers failed — record the attempt so the scraper's skip-logic can back off.
  if (persist) {
    try {
      // Use any successful tier's source as the "last attempted" tag — fall back to og_scrape
      // since tier 1 is always tried. The exact tag matters less than the attempt counter.
      setVenueDefault(input.name, "", "og_scrape");
    } catch (err) {
      console.warn(`[venue-image] could not record empty attempt for "${input.name}":`, err);
    }
  }
  return { source: "none", imageUrl: "" };
}
