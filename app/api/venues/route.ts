import { NextResponse } from "next/server";
import { hasAccountAccess } from "@/lib/session";
import { listKnownVenues } from "@/lib/venues";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(listKnownVenues());
}
