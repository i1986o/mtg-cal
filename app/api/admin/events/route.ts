import { isAuthenticated } from "@/lib/auth";
import { getAllEvents } from "@/lib/events";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getAllEvents());
}
