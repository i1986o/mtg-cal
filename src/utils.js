export function formatDate(date) { return date.toISOString().split("T")[0]; }

export function dedupe(events, keyFn = (e) => e.id) {
  const seen = new Set();
  return events.filter((e) => { const key = keyFn(e); if (seen.has(key)) return false; seen.add(key); return true; });
}

// Normalize a string for fuzzy matching: lowercase, strip punctuation, collapse spaces
function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

// Cross-source dedup: events from different sources with matching title+date+location
// are considered duplicates. Keeps the first occurrence (sources run in registry order,
// so WotC events — which have richer data — are kept over TopDeck duplicates).
export function dedupeAcrossSources(events) {
  // Pass 1: dedupe by id (same source)
  const byId = dedupe(events);

  // Pass 2: dedupe by fingerprint (cross-source)
  const seen = new Map(); // fingerprint → event
  const result = [];

  for (const e of byId) {
    const fp = normalize(e.title) + "|" + e.date + "|" + normalize(e.location);
    if (seen.has(fp)) {
      const existing = seen.get(fp);
      console.log(`[dedupe] cross-source duplicate: "${e.title}" (${e.source}) matches "${existing.title}" (${existing.source}) — keeping ${existing.source}`);
      continue;
    }
    seen.set(fp, e);
    result.push(e);
  }

  return result;
}

export function sortByDate(events) { return [...events].sort((a, b) => a.startDate - b.startDate); }

export function logSummary(events) {
  console.log("\n📅 Event Summary:");
  console.log("─".repeat(80));
  if (events.length === 0) { console.log("  No events found."); return; }
  for (const e of events) {
    const date = e.startDate?.toLocaleDateString("en-US", { weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit" }) ?? "Unknown date";
    const cost = e.cost ? ` · ${e.cost}` : "";
    console.log(`  ${date} · [${e.format}] ${e.title}`);
    console.log(`    ${e.location.name}${cost}`);
  }
  console.log("─".repeat(80));
}
