import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getEvent, updateEvent, deleteEvent } from "@/lib/events";
import { NextResponse } from "next/server";

async function loadOwned(id: string) {
  if (!(await hasAccountAccess())) return { error: "Unauthorized", status: 401 } as const;
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;
  const event = getEvent(id);
  if (!event) return { error: "Not found", status: 404 } as const;
  // Admins bypass the ownership check.
  if (user.role !== "admin" && event.owner_id !== user.id) {
    return { error: "Not found", status: 404 } as const;
  }
  return { user, event } as const;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadOwned(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.event);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadOwned(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await req.json();
  delete body.owner_id;
  delete body.source;
  delete body.source_type;
  // Non-admin users cannot self-approve by flipping status — drop it.
  if (result.user.role !== "admin") delete body.status;
  const event = updateEvent(id, body);
  return NextResponse.json({ ok: true, event });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadOwned(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  deleteEvent(id);
  return NextResponse.json({ ok: true });
}
