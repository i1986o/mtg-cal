import { getConfig } from "@/lib/runtime-config";

const API_URL = "https://topdeck.gg/api/v2/tournaments";

// Normalize TopDeck format names to our canonical names
const FORMAT_MAP: Record<string, string> = {
  "EDH": "Commander",
  "Commander": "Commander",
  "cEDH": "Commander",
  "Standard": "Standard",
  "Modern": "Modern",
  "Pioneer": "Pioneer",
  "Legacy": "Legacy",
  "Pauper": "Pauper",
  "Draft": "Draft",
  "Sealed": "Sealed",
  "Limited": "Sealed",
  "Vintage": "Vintage",
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function fetchTopdeckEvents(sourceConfig: any = {}) {
  const apiKey = sourceConfig.apiKey || process.env.TOPDECK_API_KEY;
  if (!apiKey) {
    console.warn("[topdeck] No API key — set TOPDECK_API_KEY env var or config.sources.topdeck.apiKey");
    return [];
  }

  const config = getConfig();
  const now = Math.floor(Date.now() / 1000);
  const end = Math.floor((Date.now() + config.daysAhead * 24 * 60 * 60 * 1000) / 1000);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      game: "Magic: The Gathering",
      start: now,
      end,
      columns: [],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TopDeck API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const tournaments = await res.json();
  if (!Array.isArray(tournaments)) {
    console.warn("[topdeck] Unexpected response shape:", typeof tournaments);
    return [];
  }

  console.log(`[topdeck] ${tournaments.length} MTG tournaments fetched from API`);

  // Filter by distance from configured location
  const maxMiles = config.searchRadiusMiles;
  const { lat, lng } = config.location;
  const nearby = [];

  for (const t of tournaments as any[]) {
    const loc = t.eventData || t.location || {};
    const tLat = loc.latitude;
    const tLng = loc.longitude;

    if (tLat == null || tLng == null) continue;

    const dist = haversineDistance(lat, lng, tLat, tLng);
    if (dist > maxMiles) continue;

    const startDate = new Date(t.startDate * 1000);
    const format = FORMAT_MAP[t.format] || t.format || "";

    nearby.push({
      id: "topdeck-" + (t.TID || t.tid),
      title: (t.tournamentName || t.name || "").trim(),
      format,
      date: startDate.toISOString().slice(0, 10),
      time: startDate.toISOString().slice(11, 16),
      timezone: "America/New_York",
      location: loc.name || "",
      address: [loc.city, loc.state].filter(Boolean).join(", "),
      cost: "",
      store_url: "",
      detail_url: `https://topdeck.gg/event/${t.TID || t.tid}`,
      latitude: tLat,
      longitude: tLng,
      // TopDeck's API returns per-tournament coords — trust them.
      coords_source: "source",
      source: "topdeck",
    });
  }

  console.log(`[topdeck] ${nearby.length} events within ${maxMiles}mi radius`);
  return nearby;
}
