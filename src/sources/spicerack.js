/**
 * src/sources/spicerack.js
 *
 * Fetches MTG events from Spicerack for Philadelphia-area stores.
 *
 * Strategy:
 *   1. Fetch nearby store profiles via store-profiles API (lat/lng + radius)
 *   2. For each store, fetch upcoming events via magic-events API
 *   3. Normalize into MTGEvent schema
 *
 * Confirmed working April 2026 via live browser inspection.
 * Store profiles endpoint: GET /api/store-profiles/?numMiles={r}&latitude={lat}&longitude={lng}
 * Events endpoint:         GET /api/magic-events/?store={id}&start_datetime__gte={now}&ordering=start_datetime
 */

import fetch from "node-fetch";
import { config } from "../../config.js";

const API_BASE = "https://api.spicerack.gg/api";
const STORE_URL_BASE = "https://www.spicerack.gg/events/stores";

const FORMAT_MAP = {
  STANDARD: "Standard", PIONEER: "Pioneer", MODERN: "Modern",
  LEGACY: "Legacy", VINTAGE: "Vintage", COMMANDER2: "Commander",
  PAUPER: "Pauper", BOOSTER_DRAFT: "Draft", SEALED_DECK: "Sealed",
  HISTORIC: "Historic", EXPLORER: "Explorer", TIMELESS: "Timeless",
  OATHBREAKER: "Oathbreaker", DUEL: "Duel Commander", PREMODERN: "Premodern",
  PAUPER_COMMANDER: "Pauper Commander", PREDH: "PrEDH", OTHER: "Other",
};

function formatDisplay(raw) {
  if (!raw) return "Unknown";
  return FORMAT_MAP[raw.toUpperCase()] || raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatCost(cents) {
  if (cents == null) return null;
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

async function fetchNearbyStores() {
  const { lat, lng } = config.location;
  const url = `${API_BASE}/store-profiles/?numMiles=${config.searchRadiusMiles}&latitude=${lat}&longitude=${lng}&selectedStates=&page_size=50`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; mtg-cal/1.0)" } });
  if (!res.ok) throw new Error(`Store profiles failed: ${res.status}`);
  const data = await res.json();
  return data.results || (Array.isArray(data) ? data : []);
}

async function fetchStoreEvents(storeId, storeName) {
  const now = new Date().toISOString();
  const future = new Date();
  future.setDate(future.getDate() + config.daysAhead);
  const url = `${API_BASE}/magic-events/?store=${storeId}&start_datetime__gte=${now}&start_datetime__lte=${future.toISOString()}&ordering=start_datetime&page_size=100`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; mtg-cal/1.0)" } });
  if (!res.ok) {
    console.warn(`  [spicerack] Store ${storeId} (${storeName}): HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.results || (Array.isArray(data) ? data : []);
}

function normalizeEvent(raw, store) {
  const startDate = raw.aware_start_datetime ? new Date(raw.aware_start_datetime) : null;
  const endDate = raw.end_datetime ? new Date(raw.end_datetime) : null;
  return {
    id: `spicerack-${raw.id}`,
    title: raw.name_pretty || raw.name || "MTG Event",
    format: formatDisplay(raw.event_format),
    location: {
      name: store.name || "Unknown Store",
      address: raw.full_address || store.full_address || null,
      city: null, state: null, zip: null,
      lat: raw.latitude || store.latitude || null,
      lng: raw.longitude || store.longitude || null,
      website: store.website || null,
      phone: store.phone_number || null,
      isPremium: store.is_premium || false,
      storeUrl: `${STORE_URL_BASE}/${store.id}`,
    },
    startDate,
    endDate,
    timeZone: store.timezone || "America/New_York",
    cost: formatCost(raw.cost_in_cents),
    capacity: raw.capacity || null,
    isOnline: raw.event_is_online || false,
    status: raw.event_status || "SCHEDULED",
    description: raw.description || null,
    tags: [],
    detailUrl: raw.url || `https://www.spicerack.gg/events/${raw.id}`,
    source: "spicerack",
  };
}

function passesFormatFilter(event) {
  if (!config.formatFilter?.length) return true;
  return config.formatFilter.some(f => event.format.toLowerCase().includes(f.toLowerCase()));
}

export async function fetchSpicerackEvents() {
  console.log(`[spicerack] Fetching stores within ${config.searchRadiusMiles}mi of ${config.location.city}...`);

  let stores;
  try {
    stores = await fetchNearbyStores();
  } catch (err) {
    console.error(`[spicerack] Failed to fetch stores: ${err.message}`);
    return [];
  }

  // Exclude GameStop — they rarely run sanctioned events
  const mtgStores = stores.filter(s => !s.name?.toLowerCase().includes("gamestop"));
  console.log(`[spicerack] ${mtgStores.length} stores found (${stores.length - mtgStores.length} GameStop skipped)`);

  const allRaw = [];
  await Promise.all(
    mtgStores.map(async (store) => {
      try {
        const events = await fetchStoreEvents(store.id, store.name);
        const active = events.filter(e => !e.event_is_online && e.event_status !== "CANCELLED");
        if (active.length > 0) {
          console.log(`  [spicerack] ${store.name}: ${active.length} events`);
          active.forEach(e => allRaw.push({ event: e, store }));
        }
      } catch (err) {
        console.warn(`  [spicerack] Error for ${store.name}: ${err.message}`);
      }
    })
  );

  console.log(`[spicerack] Total raw events: ${allRaw.length}`);

  const events = allRaw
    .map(({ event, store }) => normalizeEvent(event, store))
    .filter(passesFormatFilter)
    .filter(e => e.startDate !== null);

  console.log(`[spicerack] After filtering: ${events.length}`);
  return events;
}
