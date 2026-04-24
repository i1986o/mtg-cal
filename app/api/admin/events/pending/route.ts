import { hasAdminAccess } from "@/lib/session";
import { bulkUpdateStatus, bulkDelete } from "@/lib/events";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ids, action } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 });
  }
  if (action === "approve") {
    const updated = bulkUpdateStatus(ids, "active");
    return NextResponse.json({ ok: true, updated });
  }
  if (action === "reject") {
    const updated = bulkDelete(ids);
    return NextResponse.json({ ok: true, updated });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
