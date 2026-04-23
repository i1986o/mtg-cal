import { hasAdminAccess } from "@/lib/session";
import { listUsers } from "@/lib/users";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  return NextResponse.json(listUsers({ role, q }));
}
