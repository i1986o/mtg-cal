// Smoke test for the nationwide-scaling changes. Exercises:
//   1. lib/config.ts has scrapeScope + scrapeRegions
//   2. lib/runtime-config.ts loads them from settings (round-trip)
//   3. lib/curation-rules.ts classifies sample events correctly
//   4. lib/store-geocode-cache.ts upserts and reads

import { config, ScrapeScope } from "@/lib/config";
import { CONUS_GRID } from "@/lib/scrape-grid";
import { getConfig, updateConfig } from "@/lib/runtime-config";
import { classifyEvent } from "@/lib/curation-rules";
import { getCachedStoreAddress, setCachedStoreAddress, getGeocodeCacheStats } from "@/lib/store-geocode-cache";
import { normalizeFormat, formatSlug } from "@/lib/formats";
import { getActiveEvents } from "@/lib/events";

function pass(name: string) {
  console.log(`  ✓ ${name}`);
}
function fail(name: string, msg: string): never {
  console.error(`  ✗ ${name}: ${msg}`);
  process.exit(1);
}

console.log("\n=== 1. Static config has scrapeScope + scrapeRegions ===");
if (config.scrapeScope !== "national") fail("scrapeScope default", `expected national, got ${config.scrapeScope}`);
pass("config.scrapeScope === 'national'");
if (!Array.isArray(config.scrapeRegions) || config.scrapeRegions.length < 50) {
  fail("scrapeRegions length", `expected ≥50 grid points, got ${config.scrapeRegions?.length}`);
}
pass(`config.scrapeRegions has ${config.scrapeRegions.length} grid points`);
if (config.scrapeRegions !== CONUS_GRID) fail("CONUS grid wired", "config.scrapeRegions !== CONUS_GRID");
pass("scrapeRegions === CONUS_GRID");

console.log("\n=== 2. Runtime config round-trip ===");
const initial = getConfig();
console.log(`  initial: scope=${initial.scrapeScope} regions=${initial.scrapeRegions.length}`);
if (initial.scrapeScope !== "national" && initial.scrapeScope !== "local") {
  fail("scope value", `unexpected ${initial.scrapeScope}`);
}
pass("getConfig().scrapeScope is set");
if (initial.scrapeRegions.length === 0) fail("regions populated", "empty");
pass(`getConfig().scrapeRegions has ${initial.scrapeRegions.length} entries`);

// Toggle to local and back
updateConfig({ scrapeScope: "local" as ScrapeScope });
const flipped = getConfig();
if (flipped.scrapeScope !== "local") fail("scope toggle", `expected local, got ${flipped.scrapeScope}`);
pass("scope can be toggled to 'local'");
updateConfig({ scrapeScope: "national" as ScrapeScope });
const restored = getConfig();
if (restored.scrapeScope !== "national") fail("scope restore", `expected national, got ${restored.scrapeScope}`);
pass("scope can be toggled back to 'national'");

console.log("\n=== 3. Curation rules ===");
const cases: { ev: any; expected: "active" | "skip" | "pending"; hint: string }[] = [
  { ev: { id: "wotc-1", title: "Friday Night Magic", source: "wizards-locator" }, expected: "active", hint: "WotC FNM → active" },
  { ev: { id: "wotc-2", title: "Yu-Gi-Oh Tournament", source: "wizards-locator" }, expected: "skip", hint: "Yu-Gi-Oh title → skip" },
  { ev: { id: "wotc-3", title: "Pokémon League", source: "wizards-locator" }, expected: "skip", hint: "Pokémon title → skip" },
  { ev: { id: "topdeck-1", title: "Modern Open", source: "topdeck" }, expected: "active", hint: "TopDeck → active" },
  { ev: { id: "topdeck-2", title: "Flesh and Blood Skirmish", source: "topdeck" }, expected: "skip", hint: "Flesh and Blood title → skip" },
  { ev: { id: "discord-1", title: "Commander Night", source: "discord" }, expected: "pending", hint: "Discord → pending" },
  { ev: { id: "discord-2", title: "Commander Night", source: "discord", status: "pending" }, expected: "pending", hint: "explicit pending preserved" },
  { ev: { id: "discord-3", title: "Warhammer 40k", source: "discord" }, expected: "skip", hint: "Warhammer skip beats source pending" },
];
for (const c of cases) {
  const got = classifyEvent(c.ev);
  if (got.status !== c.expected) {
    fail(c.hint, `expected ${c.expected}, got ${got.status} (reason: ${got.reason})`);
  }
  pass(`${c.hint} (reason: ${got.reason})`);
}

console.log("\n=== 4. Geocode cache round-trip ===");
const testStoreId = "smoke-test-store-" + Date.now();
if (getCachedStoreAddress(testStoreId) !== null) fail("clean state", "cache pre-populated");
pass("cache miss for unseen store id");
setCachedStoreAddress(testStoreId, "123 Test St, Philadelphia, PA, 19125", 39.9688, -75.1246);
const cached = getCachedStoreAddress(testStoreId);
if (cached !== "123 Test St, Philadelphia, PA, 19125") fail("cache hit", `got ${cached}`);
pass("cache hit returns stored address");

console.log("\n=== 5. Format taxonomy ===");
const formatCases: { raw: string; expected: string }[] = [
  { raw: "EDH", expected: "Commander" },
  { raw: "cEDH", expected: "Commander" },
  { raw: "Commander", expected: "Commander" },
  { raw: "Booster Draft", expected: "Draft" },
  { raw: "Sealed Deck", expected: "Sealed" },
  { raw: "Limited", expected: "Sealed" },
  { raw: "pauper edh", expected: "Pauper EDH" },
  { raw: "Modern", expected: "Modern" },
  { raw: "  Vintage  ", expected: "Vintage" },
  { raw: "Some Random Format", expected: "Some Random Format" },
  { raw: "", expected: "" },
];
for (const c of formatCases) {
  const got = normalizeFormat(c.raw);
  if (got !== c.expected) fail(`normalizeFormat("${c.raw}")`, `expected "${c.expected}", got "${got}"`);
  pass(`normalizeFormat("${c.raw}") = "${got}"`);
}
const slugCases: { format: string; expected: string }[] = [
  { format: "Commander", expected: "commander" },
  { format: "Pauper EDH", expected: "pauper-edh" },
  { format: "Some Random Format", expected: "some-random-format" },
];
for (const c of slugCases) {
  const got = formatSlug(c.format);
  if (got !== c.expected) fail(`formatSlug("${c.format}")`, `expected "${c.expected}", got "${got}"`);
  pass(`formatSlug("${c.format}") = "${got}"`);
}

console.log("\n=== 6. Bounding-box prefilter ===");
// Verify the bbox lets through Philly events when query=Philly
// and excludes them when query=LA. Uses real DB data.
const phillyHits = getActiveEvents({ centerLat: 39.9688, centerLng: -75.1246, radiusMiles: 10 });
const laHits = getActiveEvents({ centerLat: 34.0522, centerLng: -118.2437, radiusMiles: 10 });
console.log(`  Philly 10mi: ${phillyHits.length} events`);
console.log(`  LA 10mi: ${laHits.length} events`);
if (phillyHits.length === 0) fail("Philly bbox", "expected events near Philly, got 0");
pass(`Philly bbox returns ${phillyHits.length} events`);
if (laHits.length > 5) fail("LA bbox", `expected near-zero LA events from a Philly-only DB, got ${laHits.length}`);
pass(`LA bbox returns ${laHits.length} events (DB is Philly-only — expected)`);

console.log("\n=== 7. Geocode cache stats ===");
const cacheStats = getGeocodeCacheStats();
console.log(`  total cached: ${cacheStats.total}`);
console.log(`  latest: ${cacheStats.latestCachedAt ?? "(empty)"}`);
if (typeof cacheStats.total !== "number" || cacheStats.total < 0) fail("cache stats", "bad total");
pass("getGeocodeCacheStats() returns sane shape");

console.log("\n✅ All scaling smoke tests passed.\n");
process.exit(0);
