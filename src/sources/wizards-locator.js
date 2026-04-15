import { config } from "../../config.js";

const GRAPHQL_URL = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql";

const QUERY = [
  "query searchEvents($lat:Float!,$lng:Float!,$maxMeters:Int!,$start:DateTime!,$end:DateTime!,$first:Int,$after:String){",
  "  searchEvents(lat:$lat,lng:$lng,maxMeters:$maxMeters,start:$start,end:$end,first:$first,after:$after){",
  "    edges{node{",
  "      id title scheduledStartTime",
  "      entryFee{amount}",
  "      eventFormat{name}",
  "      store{id name address{line1 city state postalCode} storeUrl}",
  "    }}",
  "    pageInfo{hasNextPage endCursor}",
  "    totalCount",
  "  }",
  "}"
].join("\n");

export async function fetchWizardsEvents() {
  const start = new Date();
  const end = new Date(Date.now() + config.daysAhead * 24 * 60 * 60 * 1000);
  const maxMeters = Math.round(config.searchRadiusMiles * 1609.34);

  const allEvents = [];
  let cursor = null;
  let page = 0;

  while (true) {
    page++;
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "searchEvents",
        variables: {
          lat: config.location.lat,
          lng: config.location.lng,
          maxMeters,
          start: start.toISOString(),
          end: end.toISOString(),
          first: 100,
          after: cursor,
        },
        query: QUERY,
      }),
    });

    if (!res.ok) throw new Error("WotC API error: " + res.status);
    const data = await res.json();
    if (data.errors) throw new Error("WotC GraphQL error: " + data.errors[0].message);
    const search = data.data && data.data.searchEvents;
    if (!search) throw new Error("Unexpected WotC response");

    const edges = search.edges || [];
    for (const edge of edges) {
      const node = edge.node;
      const addr = node.store && node.store.address;
      const fee = node.entryFee;
      allEvents.push({
        id: "wotc-" + node.id,
        title: node.title,
        format: node.eventFormat ? node.eventFormat.name : "",
        date: node.scheduledStartTime ? node.scheduledStartTime.slice(0, 10) : "",
        time: node.scheduledStartTime ? node.scheduledStartTime.slice(11, 16) : "",
        timezone: "America/New_York",
        location: node.store ? node.store.name : "",
        address: addr ? [addr.line1, addr.city, addr.state].filter(Boolean).join(", ") : "",
        cost: fee ? (fee.amount === 0 ? "Free" : "$" + Math.round(fee.amount / 100)) : "",
        store_url: node.store ? (node.store.storeUrl || "") : "",
        detail_url: node.store ? "https://locator.wizards.com/store/" + node.store.id + "/" : "",
        source: "wizards-locator",
      });
    }

    console.log("[wotc] page " + page + ": " + edges.length + " events (total so far: " + allEvents.length + " of " + search.totalCount + ")");

    if (!search.pageInfo || !search.pageInfo.hasNextPage) break;
    cursor = search.pageInfo.endCursor;
  }

  return allEvents;
}
