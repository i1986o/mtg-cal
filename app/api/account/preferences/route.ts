import { NextResponse } from "next/server";
import { getCurrentUser, hasAccountAccess } from "@/lib/session";
import { getPreferences, setPreferences } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getPreferences(user.id));
}

export async function PUT(request: Request) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    formats?: string[];
    radius_miles?: number;
    days_ahead?: number;
  };

  const patch: Parameters<typeof setPreferences>[1] = {};
  if (Array.isArray(body.formats)) patch.formats = body.formats.filter((f) => typeof f === "string");
  if (typeof body.radius_miles === "number" && body.radius_miles > 0 && body.radius_miles <= 500) {
    patch.radius_miles = Math.round(body.radius_miles);
  }
  if (typeof body.days_ahead === "number" && body.days_ahead > 0 && body.days_ahead <= 365) {
    patch.days_ahead = Math.round(body.days_ahead);
  }

  const prefs = setPreferences(user.id, patch);
  return NextResponse.json(prefs);
}
