import { hasAdminAccess } from "@/lib/session";
import { revokeSessions } from "@/lib/users";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const revoked = revokeSessions(id);
  return NextResponse.json({ ok: true, revoked });
}
