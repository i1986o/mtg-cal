import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50)));

  const rows = getDb()
    .prepare("SELECT id, ts, summary FROM scrape_history ORDER BY id DESC LIMIT ?")
    .all(limit) as { id: number; ts: string; summary: string }[];

  // Parse the JSON column server-side so the client doesn't have to repeat
  // try/catch boilerplate. A row with malformed JSON is still returned —
  // clients see `summary: null` and can decide whether to skip or surface
  // the broken row.
  const parsed = rows.map((r) => {
    let summary: unknown = null;
    try { summary = JSON.parse(r.summary); } catch { summary = null; }
    return { id: r.id, ts: r.ts, summary };
  });

  return NextResponse.json({ history: parsed });
}
