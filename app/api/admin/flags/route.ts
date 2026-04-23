import { hasAdminAccess } from "@/lib/session";
import { getAllFlags } from "@/lib/flags";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getAllFlags());
}
