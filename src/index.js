import { config } from "../config.js";
import { fetchAllSources } from "./sources/index.js";
import { upsertEvents, readActiveEvents } from "./sheets.js";
import { generateIcal } from "./output/ical.js";
import { dedupeAcrossSources, logSummary } from "./utils.js";

async function main() {
  console.log("🃏 MTG Calendar — Sheet Pipeline");
  console.log(`   Location: ${config.location.city}, ${config.location.state}`);
  console.log(`   Radius: ${config.searchRadiusMiles}mi | Days ahead: ${config.daysAhead}`);
  console.log();

  // 1. Scrape all enabled sources
  const scraped = await fetchAllSources();
  const deduped = dedupeAcrossSources(scraped);
  console.log(`[sources] Total scraped: ${deduped.length}\n`);

  // 2. Upsert into Google Sheet (source of truth)
  console.log("[sheet] Syncing to Google Sheet...");
  try {
    const s = await upsertEvents(deduped);
    console.log(`[sheet] +${s.added} new | ~${s.updated} updated | ${s.skipped} pinned | ${s.archived} archived`);
  } catch (err) {
    console.error("[sheet] FAILED:", err.message);
    console.error("        Set GOOGLE_SERVICE_ACCOUNT secret in GitHub repo settings.");
    process.exit(1);
  }

  // 3. Read curated events back from Sheet
  console.log("\n[sheet] Reading active events...");
  const events = await readActiveEvents();
  console.log(`[sheet] ${events.length} active events`);
  logSummary(events);

  // 4. Generate .ics from Sheet data
  generateIcal(events);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
