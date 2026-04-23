import { hasAdminAccess } from "@/lib/session";
import { bulkUpdateStatus, bulkDelete } from "@/lib/events";
import { NextResponse } from "next/server";

const STATUS_FOR_ACTION: Record<string, string> = {
  pin: "pinned",
  skip: "skip",
  activate: "active",
};

export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ids, action } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 });
  }
  if (action === "delete") {
    const updated = bulkDelete(ids);
    return NextResponse.json({ ok: true, updated });
  }
  const status = STATUS_FOR_ACTION[action];
  if (!status) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const updated = bulkUpdateStatus(ids, status);
  return NextResponse.json({ ok: true, updated });
}
