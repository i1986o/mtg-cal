import { NextResponse } from "next/server";
import { hasAccountAccess } from "@/lib/session";
import { saveUpload, UploadError } from "@/lib/upload-storage";

export const dynamic = "force-dynamic";
// Next runs route handlers on the Node runtime by default; the file-system
// writes in saveUpload need that explicitly when the rest of the app moves
// to edge later.
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasAccountAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected multipart/form-data with a 'file' field" }, { status: 400 });
  }

  try {
    const saved = await saveUpload("events", file);
    return NextResponse.json({ url: saved.url });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[upload] event-image failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
