import { hasAdminAccess } from "@/lib/session";
import { setFlag } from "@/lib/flags";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { key } = await params;
  const body = await request.json();
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` (boolean) required" }, { status: 400 });
  }
  const flag = setFlag(key, body.enabled, body.description);
  return NextResponse.json({ ok: true, flag });
}
