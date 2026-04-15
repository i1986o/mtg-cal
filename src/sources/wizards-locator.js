import { config } from "../../config.js";

const GRAPHQL_URL = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql";
const PAGE_SIZE = 200;

const QUERY = `query searchEvents($q: EventSearchQuery!) {
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

export async function fetchWizardsEvents() {
  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + config.daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const maxMeters = Math.round(config.searchRadiusMiles * 1609.34);

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
      body: JSON.stringify({ operationName: "searchEvents", variables, query: QUERY }),
    });

    if (!res.ok) throw new Error("WotC API HTTP error: " + res.status);
    const data = await res.json();
    if (data.errors) throw new Error("WotC GraphQL: " + data.errors[0].message);

    const events = data.data?.searchEvents?.events;
    if (!events) throw new Error("No searchEvents in response");

    for (const ev of events) {
      const fee = ev.entryFee;
      const venueName = ev.venue?.name || "";
      // Extract store name from title patterns:
      //   "Commander Night @ Queen & Rook Game Tavern!"
      //   "Queen & Rook Presents: Secrets of Strixhaven"
      //   "PGS Modern Thursdays"  (no reliable pattern — leave blank)
      const atMatch = ev.title?.match(/@\s*(.+)/);
      const location = venueName || (atMatch ? atMatch[1].replace(/[!.]+$/, "").trim() : "");
      const venueAddress = ev.venue?.address || ev.address || "";

      allEvents.push({
        id: "wotc-" + ev.id,
        title: (ev.title || "").trim(),
        format: ev.eventFormat?.name || "",
        date: (ev.scheduledStartTime || "").slice(0, 10),
        time: (ev.scheduledStartTime || "").slice(11, 16),
        timezone: "America/New_York",
        location,
        address: venueAddress,
        cost: fee ? (fee.amount === 0 ? "Free" : "$" + Math.round(fee.amount / 100)) : "",
        store_url: "",
        detail_url: ev.venue?.id
          ? "https://locator.wizards.com/store/" + ev.venue.id + "/"
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
