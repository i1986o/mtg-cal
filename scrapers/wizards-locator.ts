import { config } from "@/lib/config";

const GRAPHQL_URL = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql";
const PAGE_SIZE = 200;

const EVENTS_QUERY = `query searchEvents($q: EventSearchQuery!) {
  searchEvents(query: $q) {
    events {
      id title scheduledStartTime description tags status
      latitude longitude address
      entryFee { amount currency }
      eventFormat { name }
      venue { id name address }
    }
  }
}`;

const STORES_QUERY = `query storesByLocation($input: StoreByLocationInput!) {
  storesByLocation(input: $input) {
    stores { id name latitude longitude website phoneNumber }
  }
}`;

async function fetchStores(maxMeters: number) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "storesByLocation",
      variables: {
        input: {
          latitude: config.location.lat,
          longitude: config.location.lng,
          maxMeters,
        },
      },
      query: STORES_QUERY,
    }),
  });

  if (!res.ok) throw new Error("WotC stores API HTTP error: " + res.status);
  const data = await res.json();
  if (data.errors) throw new Error("WotC stores GraphQL: " + data.errors[0].message);
  return data.data?.storesByLocation?.stores || [];
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "mtg-cal-bot/1.0 (https://github.com/i1986o/mtg-cal)" },
  });
  if (!res.ok) return "";
  const data = await res.json();
  const a = data.address;
  if (!a) return "";
  const parts = [
    a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road || "",
    a.city || a.town || a.village || "",
    a.state || "",
    a.postcode || "",
  ].filter(Boolean);
  return parts.join(", ");
}

function findStore(stores: any[], lat: number, lng: number) {
  if (lat == null || lng == null) return null;
  let best = null;
  let bestDist = Infinity;
  for (const s of stores) {
    const d = Math.abs(s.latitude - lat) + Math.abs(s.longitude - lng);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  // ~0.002 degrees ≈ 200m — generous tolerance for GPS variance
  return bestDist < 0.002 ? best : null;
}

export default async function fetchWizardsEvents(sourceConfig = {}) {
  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + config.daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const maxMeters = Math.round(config.searchRadiusMiles * 1609.34);

  // Step 1: Fetch all stores in the radius and reverse-geocode their addresses
  const stores = await fetchStores(maxMeters);
  console.log(`[wotc] ${stores.length} stores found in radius`);

  const storeAddresses: Record<string, string> = {};
  for (const s of stores) {
    storeAddresses[s.id] = await reverseGeocode(s.latitude, s.longitude);
    // Nominatim asks for max 1 request/second
    await new Promise((r) => setTimeout(r, 1100));
  }
  console.log(`[wotc] reverse-geocoded ${Object.keys(storeAddresses).length} store addresses`);

  // Step 2: Fetch all events with pagination
  const allEvents = [];
  let page = 0;

  while (true) {
    const variables = {
      q: {
        latitude: config.location.lat,
        longitude: config.location.lng,
        maxMeters,
        startDate,
        endDate,
        page,
        pageSize: PAGE_SIZE,
      },
    };

    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationName: "searchEvents", variables, query: EVENTS_QUERY }),
    });

    if (!res.ok) throw new Error("WotC API HTTP error: " + res.status);
    const data = await res.json();
    if (data.errors) throw new Error("WotC GraphQL: " + data.errors[0].message);

    const events = data.data?.searchEvents?.events;
    if (!events) throw new Error("No searchEvents in response");

    for (const ev of events as any[]) {
      const fee = ev.entryFee;
      const store = findStore(stores, ev.latitude, ev.longitude);

      allEvents.push({
        id: "wotc-" + ev.id,
        title: (ev.title || "").trim(),
        format: (ev.eventFormat?.name || "").replace("Sealed Deck", "Sealed").replace("Booster Draft", "Draft"),
        date: (ev.scheduledStartTime || "").slice(0, 10),
        time: (ev.scheduledStartTime || "").slice(11, 16),
        timezone: "America/New_York",
        location: store?.name || "",
        address: store ? storeAddresses[store.id] || "" : "",
        cost: fee ? (fee.amount === 0 ? "Free" : "$" + Math.round(fee.amount / 100)) : "",
        store_url: store?.website || "",
        detail_url: store
          ? "https://locator.wizards.com/store/" + store.id + "/"
          : "",
        source: "wizards-locator",
      });
    }

    console.log(
      `[wotc] page ${page}: ${events.length} events (running total: ${allEvents.length})`
    );

    if (events.length < PAGE_SIZE) break;
    page++;
  }

  return allEvents;
}
