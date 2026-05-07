// Post-deploy helper: trigger a production scrape via /api/scrape and
// poll /api/health until the event count stabilizes (signals completion).
//
// Why this exists rather than just curl: a cold nationwide scrape takes
// 10–15 minutes. With the fire-and-forget Phase-1 changes, /api/scrape
// returns 202 immediately — useful for cron, but a human running this
// from the terminal wants to *see* completion. This wraps:
//   1. POST /api/scrape with the secret
//   2. Poll /api/health every 30s until eventCount stops climbing
//   3. Print a tidy summary
//
// Usage:
//   SCRAPE_SECRET=<value> npm run scrape:trigger
//   SCRAPE_SECRET=<value> SITE_URL=https://playirl.gg npm run scrape:trigger
//
// Bail with Ctrl-C any time; the scrape on the server keeps running.

// `export {}` makes this file a TS module so its top-level names don't
// collide with sibling cli/*.ts scripts during a project-wide tsc run.
export {};

const DEFAULT_SITE = "https://playirl.gg";
const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_MINUTES = 25; // hard ceiling so the script doesn't hang forever
const STABLE_AFTER_POLLS = 3; // count is "done" if unchanged across N consecutive polls

function envRequired(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ ${name} is required. Generate one with: openssl rand -hex 32`);
    console.error(`  Then set it on Railway AND export it locally before running this script.`);
    process.exit(1);
  }
  return v;
}

interface HealthResponse {
  ok: boolean;
  eventCount?: number;
  lastScrape?: string | null;
  dbProbeMs?: number;
  ts?: string;
  error?: string;
}

async function fetchHealth(siteUrl: string): Promise<HealthResponse> {
  const res = await fetch(`${siteUrl}/api/health`);
  if (!res.ok) throw new Error(`/api/health HTTP ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

async function main() {
  const secret = envRequired("SCRAPE_SECRET");
  const siteUrl = process.env.SITE_URL ?? DEFAULT_SITE;

  console.log(`\n🃏 Triggering production scrape at ${siteUrl}\n`);

  // Snapshot the starting state so we can report the delta at the end.
  let baseline: HealthResponse;
  try {
    baseline = await fetchHealth(siteUrl);
  } catch (err: any) {
    console.error(`✗ Couldn't reach ${siteUrl}/api/health: ${err.message}`);
    console.error(`  Is the service deployed and reachable?`);
    process.exit(1);
  }
  console.log(`Before: ${baseline.eventCount ?? "?"} events, last scrape ${baseline.lastScrape ?? "never"}`);

  // Kick off the scrape.
  const triggerRes = await fetch(`${siteUrl}/api/scrape`, {
    method: "POST",
    headers: { "x-scrape-secret": secret },
  });

  if (triggerRes.status === 409) {
    const body = await triggerRes.json().catch(() => ({}));
    console.log(`⚠ Another scrape is already running (started ${body.runningSince}, source=${body.runningSource}).`);
    console.log(`  Polling for completion anyway…\n`);
  } else if (triggerRes.status !== 202) {
    const body = await triggerRes.text().catch(() => "");
    console.error(`✗ Trigger failed: HTTP ${triggerRes.status} — ${body.slice(0, 200)}`);
    process.exit(1);
  } else {
    const body = await triggerRes.json();
    console.log(`✓ Scrape started at ${body.startedAt} (source: ${body.source})\n`);
  }

  // Poll /api/health. Completion signal: eventCount unchanged across
  // STABLE_AFTER_POLLS consecutive polls AND lastScrape is newer than
  // the baseline (proves the scrape actually wrote a result).
  const startedAt = Date.now();
  let lastCount = baseline.eventCount ?? 0;
  let stableCount = 0;
  let lastSeenScrape = baseline.lastScrape ?? "";

  while (true) {
    const elapsedMin = (Date.now() - startedAt) / 60_000;
    if (elapsedMin > MAX_POLL_MINUTES) {
      console.log(`\n⏱  Hit the ${MAX_POLL_MINUTES}-min poll ceiling. Scrape may still be running on the server.`);
      console.log(`   Check /admin/scrapers for the current run state.`);
      process.exit(0);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    let h: HealthResponse;
    try {
      h = await fetchHealth(siteUrl);
    } catch (err: any) {
      console.log(`  ⚠ poll failed: ${err.message} — retrying`);
      continue;
    }

    const elapsed = `${elapsedMin.toFixed(1)}min`;
    const count = h.eventCount ?? 0;
    const delta = count - (baseline.eventCount ?? 0);

    if (h.lastScrape && h.lastScrape !== lastSeenScrape && count === lastCount) {
      stableCount++;
    } else {
      stableCount = 0;
    }

    console.log(`  [${elapsed}] events=${count} (Δ${delta >= 0 ? "+" : ""}${delta})  lastScrape=${h.lastScrape}  stable=${stableCount}/${STABLE_AFTER_POLLS}`);

    lastCount = count;
    lastSeenScrape = h.lastScrape ?? "";

    if (stableCount >= STABLE_AFTER_POLLS && h.lastScrape && h.lastScrape !== (baseline.lastScrape ?? "")) {
      const after = await fetchHealth(siteUrl);
      console.log(`\n✅ Done. ${after.eventCount} events (Δ +${(after.eventCount ?? 0) - (baseline.eventCount ?? 0)} from baseline).`);
      console.log(`   Last scrape: ${after.lastScrape}`);
      console.log(`\nNext: visit /admin/scrapers for per-source breakdown, or hit /?lat=40.728&lng=-73.946&radius=5 to spot-check NYC.\n`);
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
