import { config } from "../../config.js";

const GRAPHQL_URL = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql";

const QUERY = `query searchEvents($lat:Float!,$lng:Float!,$maxMeters:Int!,$start:DateTime!,$end:DateTime!,$first:Int,$after:String){
  searchEvents(lat:$lat,lng:$lng,maxMeters:$maxMeters,start:$start,end:$end,first:$first,after:$after){
    edges{node{
      id title scheduledStartTime
      entryFee{amount}
      eventFormat{name}
      store{id name address{line1 city state postalCode} storeUrl}
    }}
    pageInfo{hasNextPage endCursor}
    totalCount
  }
}`;

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

    if (!res.ok) throw new Error(`WotC API error: ${res.status}`);
    const data = await res.json();
    const search = data.data?.searchEvents;
    if (!search) throw new Error("Unexpected WotC response: " + JSON.stringify(data).slice(0, 200));

    const edges = search.edges || [];
    for (const { node } of edges) {
      allEvents.push({
        id: "wotc-" + node.id,
        title: node.title,
        format: node.eventFormat?.name || "",
        date: node.scheduledStartTime?.slice(0, 10),
        time: node.scheduledStartTime?.slice(11, 16),
        timezone: "America/New_York",
        location: node.store?.name || "",
        address: [node.store?.address?.line1, node.store?.address?.city, node.store?.address?.state].filter(Boolean).join(", "),
        cost: node.entryFee?.amount != null ? (node.entryFee.amount === 0 ? "Free" : `$${(node.entryFee.amount / 100).toFixed(0)}`) : "",
        store_url: node.store?.storeUrl || "",
        detail_url: node.store?.id ? `https://locator.wizards.com/store/${node.store.id}/` : "",
        source: "wizards-locator",
      });
    }

    console.log(`[wotc] page ${page}: ${edges.length} events (total so far: ${allEvents.length} of ${search.totalCount})`);

    if (!search.pageInfo?.hasNextPage) break;
    cursor = search.pageInfo.endCursor;
  }

  return allEvents;
}
