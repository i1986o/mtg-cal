import { NextResponse } from "next/server";
import fs from "fs/promises";
import { contentTypeFromPath, resolveUploadPath } from "@/lib/upload-storage";

/**
 * Streams an uploaded image file from the Railway volume. Filenames are
 * content-keyed UUIDs, so cached responses are safe to mark immutable.
 *
 * Path traversal and unknown buckets are rejected by `resolveUploadPath`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  if (!Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filePath = resolveUploadPath(parts);
  if (!filePath) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFromPath(filePath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
