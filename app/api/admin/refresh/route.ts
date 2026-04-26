import { hasAdminAccess } from "@/lib/session";
import { runScraper } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for scraping

export async function POST() {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScraper();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    // Surface the real failure — `err.message` alone can be undefined for
    // string throws, plain-object throws, etc., which renders as the
    // unhelpful "Error: undefined" in the admin UI. Always include a stable
    // string and log the full thing server-side so it shows up in Railway.
    console.error("[refresh] runScraper failed:", err);
    const message =
      err instanceof Error
        ? err.message || err.name || "Error"
        : typeof err === "string"
          ? err
          : JSON.stringify(err) || "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
