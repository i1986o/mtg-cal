/**
 * src/index.js — MTG Calendar Aggregator
 */
import { config } from "../config.js";
import { fetchWizardsEvents } from "./sources/wizards-locator.js";
import { fetchSpicerackEvents } from "./sources/spicerack.js";
import { generateIcal } from "./output/ical.js";
import { dedupe, sortByDate, logSummary } from "./utils.js";

async function main() {
  console.log("\ud83c\udccf MTG Calendar Aggregator");
  console.log(`   Location: ${config.location.city}, ${config.location.state} (${config.location.zip})`);
  console.log(`   Radius: ${config.searchRadiusMiles} miles`);
  console.log(`   Days ahead: ${config.daysAhead}`);
  if (config.formatFilter.length > 0) {
    console.log(`   Format filter: ${config.formatFilter.join(", ")}`);
  }
  console.log();

  const allEvents = [];

  if (config.sources.wizardsLocator) {
    const events = await fetchWizardsEvents();
    allEvents.push(...events);
  }

  if (config.sources.spicerack) {
    const events = await fetchSpicerackEvents();
    allEvents.push(...events);
  }

  const deduped = dedupe(allEvents);
  const sorted = sortByDate(deduped);

  logSummary(sorted);
  generateIcal(sorted);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
