import { hasAdminAccess } from "@/lib/session";
import { getConfig, updateConfig } from "@/lib/runtime-config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getConfig());
}

export async function PUT(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const updated = updateConfig(body);
  return NextResponse.json({ ok: true, config: updated });
}
