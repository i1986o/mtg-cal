import { fetchAllSources, ScrapedEvent } from "@/scrapers";
import { upsertEvents, archiveOldEvents, setSetting } from "./events";

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function dedupeAcrossSources(events: ScrapedEvent[]): ScrapedEvent[] {
  // Pass 1: dedupe by id
  const seenIds = new Set<string>();
  const byId = events.filter((e) => {
    if (seenIds.has(e.id)) return false;
    seenIds.add(e.id);
    return true;
  });

  // Pass 2: dedupe by fingerprint (cross-source)
  const seen = new Map<string, ScrapedEvent>();
  const result: ScrapedEvent[] = [];

  for (const e of byId) {
    const fp = normalize(e.title) + "|" + e.date + "|" + normalize(e.location);
    if (seen.has(fp)) {
      const existing = seen.get(fp)!;
      console.log(`[dedupe] cross-source duplicate: "${e.title}" (${e.source}) matches "${existing.title}" (${existing.source}) — keeping ${existing.source}`);
      continue;
    }
    seen.set(fp, e);
    result.push(e);
  }

  return result;
}

export async function runScraper(): Promise<{
  scraped: number;
  deduped: number;
  added: number;
  updated: number;
  skipped: number;
  archived: number;
}> {
  console.log("🃏 MTG Calendar — Scraper Run");
  console.log(`   ${new Date().toISOString()}`);

  // 1. Fetch from all sources
  const scraped = await fetchAllSources();
  console.log(`[sources] Total scraped: ${scraped.length}`);

  // 2. Dedupe
  const deduped = dedupeAcrossSources(scraped);
  console.log(`[dedupe] After dedup: ${deduped.length}`);

  // 3. Upsert into database
  const result = upsertEvents(deduped);
  console.log(`[db] +${result.added} new | ~${result.updated} updated | ${result.skipped} pinned`);

  // 4. Archive old events
  const archived = archiveOldEvents(90);
  if (archived > 0) console.log(`[db] Archived ${archived} old events`);

  // 5. Update last scrape timestamp
  const now = new Date().toISOString();
  setSetting("last_scrape", now);
  setSetting("last_scrape_result", JSON.stringify({
    scraped: scraped.length,
    deduped: deduped.length,
    ...result,
    archived,
    timestamp: now,
  }));

  return {
    scraped: scraped.length,
    deduped: deduped.length,
    ...result,
    archived,
  };
}
