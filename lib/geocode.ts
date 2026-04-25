/**
 * Client-side geocoding via OpenStreetMap Nominatim. Returns coordinates for a
 * free-form address, or null if nothing matched. Intentionally forgiving —
 * callers fall back to "no coords" on any failure so we never block a form.
 *
 * Nominatim asks for reasonable use; we send at most one lookup per form blur,
 * which is well under their guidance of ≤1 rps.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}
