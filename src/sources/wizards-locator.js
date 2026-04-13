import fetch from "node-fetch";
import { config } from "../../config.js";

const GRAPHQL_URL = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql";
const STORE_BASE_URL = "https://locator.wizards.com/store/";
const METERS_PER_MILE = 1609.34;

const QUERY = `
  query searchEvents($latitude: Float!, $longitude: Float!, $maxMeters: Int!, $page: Int, $pageSize: Int) {
    searchEvents(query: { latitude: $latitude longitude: $longitude maxMeters: $maxMeters page: $page pageSize: $pageSize }) {
      events {
        id title description scheduledStartTime timeZone status isOnline distance capacity tags
        eventFormat { eventTag { tag } }
        entryFee { amount currency }
        cardSet { name }
        pairingType rulesEnforcementLevel
        organization { id name latitude longitude emailAddress phoneNumber website isPremium }
      }
      pageInfo { page pageSize totalResults }
    }
  }
`;

function formatTag(tag) {
  if (!tag) return "Unknown";
  const map = { standard:"Standard", pioneer:"Pioneer", modern:"Modern", legacy:"Legacy", vintage:"Vintage", pauper:"Pauper", commander:"Commander", sealed_deck:"Sealed", booster_draft:"Draft", limited:"Limited", prerelease:"Prerelease", friday_night_magic:"FNM", fnm:"FNM", two_headed_giant:"Two-Headed Giant", brawl:"Brawl", alchemy:"Alchemy", explorer:"Explorer", historic:"Historic", oathbreaker:"Oathbreaker" };
  return map[tag.toLowerCase()] || tag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatCost(fee) {
  if (!fee) return null;
  if (fee.amount === 0) return "Free";
  return `$${(fee.amount / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function normalize(raw) {
  const org = raw.organization || {};
  const storeUrl = org.id ? STORE_BASE_URL + org.id : null;
  return {
    id: `wotc-${raw.id}`,
    title: raw.title || "MTG Event",
    format: formatTag(raw.eventFormat?.eventTag?.tag || null),
    location: { name: org.name || "Unknown Store", address: null, city: null, state: null, zip: null, lat: org.latitude || null, lng: org.longitude || null, website: org.website || null, email: org.emailAddress || null, phone: org.phoneNumber || null, isPremium: org.isPremium || false, storeUrl },
    startDate: raw.scheduledStartTime ? new Date(raw.scheduledStartTime) : null,
    endDate: null,
    timeZone: raw.timeZone || "America/New_York",
    cost: formatCost(raw.entryFee),
    capacity: raw.capacity || null,
    isOnline: raw.isOnline || false,
    status: raw.status || "SCHEDULED",
    distanceMeters: raw.distance || null,
    description: raw.description || null,
    cardSet: raw.cardSet?.name || null,
    tags: raw.tags || [],
    detailUrl: `https://locator.wizards.com/event/${raw.id}`,
    source: "wizards-locator",
  };
}

async function fetchPage(lat, lng, maxMeters, page, pageSize = 50) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; mtg-cal/1.0)", "Referer": "https://locator.wizards.com/" },
    body: JSON.stringify({ operationName: "searchEvents", variables: { latitude: lat, longitude: lng, maxMeters, page, pageSize }, query: QUERY }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL: ${data.errors.map(e => e.message).join(", ")}`);
  return data.data.searchEvents;
}

export async function fetchWizardsEvents() {
  const { lat, lng } = config.location;
  const maxMeters = Math.round(config.searchRadiusMiles * METERS_PER_MILE);
  console.log(`[wizards-locator] Fetching within ${config.searchRadiusMiles}mi of ${config.location.city}...`);
  let allRaw = [];
  try {
    const first = await fetchPage(lat, lng, maxMeters, 1, 50);
    allRaw.push(...first.events);
    const total = first.pageInfo.totalResults;
    const pages = Math.ceil(total / 50);
    console.log(`[wizards-locator] ${total} total events, ${pages} page(s)`);
    for (let p = 2; p <= pages; p++) {
      const r = await fetchPage(lat, lng, maxMeters, p, 50);
      allRaw.push(...r.events);
    }
  } catch (err) {
    console.error(`[wizards-locator] Fetch failed: ${err.message}`);
    return [];
  }
  console.log(`[wizards-locator] Raw: ${allRaw.length}`);
  const events = allRaw
    .filter(e => e.status !== "CANCELLED" && !e.isOnline)
    .map(normalize)
    .filter(e => !config.formatFilter?.length || config.formatFilter.some(f => e.format.toLowerCase().includes(f.toLowerCase())))
    .filter(e => { const id = e.location.storeUrl?.split("/").pop(); if (config.storeBlocklist?.includes(id)) return false; if (config.storeAllowlist?.length) return config.storeAllowlist.includes(id); return true; })
    .filter(e => e.startDate !== null);
  console.log(`[wizards-locator] After filtering: ${events.length}`);
  return events;
}
