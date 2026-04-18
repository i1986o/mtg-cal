import { isAuthenticated } from "@/lib/auth";
import { runScraper } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for scraping

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScraper();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
