import { runScraper } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for scraping

/**
 * POST /api/scrape
 *
 * Public scraper trigger for the Railway Cron Job.
 * Validates the `x-scrape-secret` header against SCRAPE_SECRET env var.
 *
 * Usage (Railway cron command):
 *   curl -X POST https://playirl.gg/api/scrape -H "x-scrape-secret: $SCRAPE_SECRET"
 *
 * Set SCRAPE_SECRET to a random string in Railway env vars.
 */
export async function POST(request: Request) {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SCRAPE_SECRET not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-scrape-secret");
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScraper();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
