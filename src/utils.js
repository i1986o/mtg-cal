export function formatDate(date) { return date.toISOString().split("T")[0]; }
export function dedupe(events, keyFn = (e) => e.id) {
  const seen = new Set();
  return events.filter((e) => { const key = keyFn(e); if (seen.has(key)) return false; seen.add(key); return true; });
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
