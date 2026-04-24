import { getCurrentUser, hasAdminAccess } from "@/lib/session";
import { getUser, updateUser, getUserSessions } from "@/lib/users";
import { getEventsByOwner } from "@/lib/events";
import { logAdminAction } from "@/lib/admin-actions";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const user = getUser(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    user,
    events: getEventsByOwner(id),
    sessions: getUserSessions(id),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const before = getUser(id);
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = (await request.json()) as {
    role?: string;
    suspended?: boolean;
    name?: string;
    suspended_reason?: string;
  };

  if (body.suspended === true && !before.suspended && !(body.suspended_reason ?? "").trim()) {
    return NextResponse.json({ error: "suspended_reason is required when suspending" }, { status: 400 });
  }

  const user = updateUser(id, body);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.role !== undefined && body.role !== before.role) {
    logAdminAction({ admin_id: admin.id, target_user_id: id, action: `role:${before.role}→${body.role}` });
  }
  if (body.suspended === true && before.suspended === 0) {
    logAdminAction({
      admin_id: admin.id,
      target_user_id: id,
      action: "suspend",
      reason: (body.suspended_reason ?? "").trim(),
    });
  }
  if (body.suspended === false && before.suspended === 1) {
    logAdminAction({ admin_id: admin.id, target_user_id: id, action: "restore" });
  }

  return NextResponse.json({ ok: true, user });
}
