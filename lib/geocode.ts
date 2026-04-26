/**
 * Address → coordinates. Used at scrape-time (to derive trustworthy lat/lng
 * for sources that don't expose per-event coords, like Discord), in admin/
 * organizer forms (to auto-fill lat/lng on blur), and by the backfill CLI.
 *
 * Two providers, in order:
 *   1. Mapbox forward-geocoding — best accuracy + speed, requires a token
 *      (NEXT_PUBLIC_MAPBOX_TOKEN, or the server-only MAPBOX_TOKEN alias).
 *   2. OpenStreetMap Nominatim — free, no key required, ToS expects a
 *      descriptive User-Agent and ≤1 rps. The WotC scraper already calls
 *      Nominatim for reverse-geocoding, so no new dependency.
 *
 * Returns `null` when both fail. Callers fall back to "no coords" — never
 * block a UI flow on geocoder availability.
 */

const NOMINATIM_USER_AGENT = "playirl-gg/1.0 (+https://playirl.gg)";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Which provider produced the hit. Optional — older callers ignore it. */
  provider?: "mapbox" | "nominatim";
}

async function tryMapbox(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
  if (!token) return null;
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", token);
  try {
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: Array<{ center?: [number, number] }> };
    const center = data.features?.[0]?.center;
    if (!center) return null;
    const [lng, lat] = center;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng, provider: "mapbox" };
  } catch {
    return null;
  }
}

async function tryNominatim(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en", "User-Agent": NOMINATIM_USER_AGENT },
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng, provider: "nominatim" };
  } catch {
    return null;
  }
}

/**
 * Geocode a free-text address. Tries Mapbox first when configured, falls back
 * to Nominatim. Returns null when no provider produces a result.
 */
export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const q = (query ?? "").trim();
  if (!q) return null;
  const mapbox = await tryMapbox(q, signal);
  if (mapbox) return mapbox;
  return tryNominatim(q, signal);
}

/**
 * Try several candidate query strings in order, returning the first successful
 * geocode. Use this when you have multiple reasonable phrasings — for instance
 * the address alone (cleanest for Nominatim) and the location-name + address
 * combo (richer context for Mapbox / TopDeck-style "city, state" rows).
 *
 * Empty / whitespace-only candidates are skipped.
 */
export async function geocodeFirstMatch(
  candidates: Array<string | null | undefined>,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const seen = new Set<string>();
  for (const c of candidates) {
    const q = (c ?? "").trim();
    if (!q || seen.has(q)) continue;
    seen.add(q);
    const hit = await geocodeAddress(q, signal);
    if (hit) return hit;
  }
  return null;
}
