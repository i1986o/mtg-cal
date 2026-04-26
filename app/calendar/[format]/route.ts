import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy format-slug route. The canonical feed URL is now
 * `/calendar?format={Name}` — this route stays for existing webcal://
 * subscribers and 308-redirects to the canonical form. webcal:// clients
 * follow 308 transparently on next refresh.
 */
const SLUG_TO_FORMAT: Record<string, string> = {
  commander: "Commander",
  modern: "Modern",
  standard: "Standard",
  pioneer: "Pioneer",
  legacy: "Legacy",
  pauper: "Pauper",
  draft: "Draft",
  sealed: "Sealed",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const { format: slug } = await params;
  const format = SLUG_TO_FORMAT[slug.toLowerCase()];

  if (!format) {
    return NextResponse.json({ error: "Unknown format" }, { status: 404 });
  }

  const target = new URL(`/calendar?format=${encodeURIComponent(format)}`, request.url);
  return NextResponse.redirect(target, 308);
}
