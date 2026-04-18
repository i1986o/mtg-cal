import { isAuthenticated } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/events";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    scrape_interval_hours: getSetting("scrape_interval_hours"),
    last_scrape: getSetting("last_scrape"),
    last_scrape_result: getSetting("last_scrape_result"),
  });
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (body.scrape_interval_hours) {
    setSetting("scrape_interval_hours", body.scrape_interval_hours.toString());
  }

  return NextResponse.json({ ok: true });
}
