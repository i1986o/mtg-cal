// Health check endpoint for Railway, uptime monitors, and load balancers.
//
//   GET /api/health
//     200 { ok: true, ... }            — DB reachable, app responding
//     503 { ok: false, error: "..." }  — DB unreachable or other fatal
//
// Public (no auth) on purpose. Returns aggregate stats only — no PII, no
// secrets — so it's safe to expose to anything that pings periodically.
//
// What "healthy" means: the SQLite handle opens and a trivial COUNT query
// succeeds. That covers the failure modes that actually matter on Railway:
//   - Volume detached / not mounted
//   - DB file corrupted
//   - Container OOM'd between requests
// We deliberately don't probe scraper freshness here — a stale scrape isn't
// an availability issue (the API still serves data), and the admin dashboard
// already surfaces last_scrape with the same data.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/events";

export const dynamic = "force-dynamic";
// Keep tight — health checks shouldn't queue. If we can't answer in 5s
// something is wrong upstream and the caller should treat it as a failure.
export const maxDuration = 10;

export async function GET() {
  const startedAt = Date.now();
  try {
    const db = getDb();
    const eventCount = (db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
    const lastScrape = getSetting("last_scrape") || null;
    const dbProbeMs = Date.now() - startedAt;
    return NextResponse.json(
      {
        ok: true,
        eventCount,
        lastScrape,
        dbProbeMs,
        ts: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message || err.name : String(err);
    console.error("[health] DB probe failed:", err);
    return NextResponse.json(
      { ok: false, error: message, ts: new Date().toISOString() },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
