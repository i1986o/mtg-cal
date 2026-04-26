import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/session";
import { saveUpload, deleteUpload, UploadError } from "@/lib/upload-storage";
import { getVenueDefault, setVenueDefault, deleteVenueDefault } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { key } = await params;
  const venueName = decodeURIComponent(key);
  if (!venueName.trim()) {
    return NextResponse.json({ error: "Venue name is required" }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected multipart/form-data with a 'file' field" }, { status: 400 });
  }

  try {
    const saved = await saveUpload("venues", file);
    const previous = getVenueDefault(venueName);
    const next = setVenueDefault(venueName, saved.url, "manual");
    // Best-effort cleanup of the prior file so we don't leak storage.
    if (previous && previous.image_url !== saved.url) {
      void deleteUpload(previous.image_url);
    }
    return NextResponse.json({ ok: true, default: next });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[upload] venue-image failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { key } = await params;
  const venueName = decodeURIComponent(key);
  const removed = deleteVenueDefault(venueName);
  if (removed) void deleteUpload(removed.image_url);
  return NextResponse.json({ ok: true });
}
