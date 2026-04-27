import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEvent } from "@/lib/events";
import { deleteInvite, getInvite } from "@/lib/event-invites";

export const dynamic = "force-dynamic";

/** DELETE — revoke an invite token. Host-only. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, inviteId } = await params;
  const event = getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "admin" && event.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invite = getInvite(inviteId);
  if (!invite || invite.event_id !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  deleteInvite(inviteId);
  return NextResponse.json({ ok: true });
}
