// Unit-style smoke test for /api/internal/backup. Sets BACKUP_SECRET in
// process.env, calls the route handler directly, and asserts it gates on
// the header and emits a real SQLite snapshot. Lives here (not in a /test
// dir) because the project doesn't run a test framework — these are
// runnable scripts triggered manually after scaling-related changes.

process.env.BACKUP_SECRET = "test-secret-abc-123";

import { gunzipSync } from "node:zlib";
import { GET } from "@/app/api/internal/backup/route";

async function check(name: string, headers: Record<string, string>) {
  const req = new Request("http://localhost/api/internal/backup", { method: "GET", headers });
  const res = await GET(req);
  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/gzip")
    ? `<gzip ${res.headers.get("content-length")}B>`
    : await res.text();
  console.log(`  ${name}: status=${res.status} ${body.slice(0, 120)}`);
  return res;
}

(async () => {
  console.log("=== /api/internal/backup smoke test ===\n");

  const r1 = await check("no header (should 401)", {});
  if (r1.status !== 401) { console.error("FAIL: expected 401"); process.exit(1); }

  const r2 = await check("wrong secret (should 401)", { "x-backup-secret": "wrong" });
  if (r2.status !== 401) { console.error("FAIL: expected 401"); process.exit(1); }

  const r3 = await check("correct secret (should 200)", { "x-backup-secret": "test-secret-abc-123" });
  if (r3.status !== 200) { console.error("FAIL: expected 200"); process.exit(1); }

  // Decompress and verify the payload is a real SQLite file. The first 16
  // bytes of every SQLite file are the literal "SQLite format 3\0".
  const buf = Buffer.from(await r3.arrayBuffer());
  const raw = gunzipSync(buf);
  const magic = raw.toString("ascii", 0, 16);
  console.log(`\n  payload: gz=${buf.byteLength}B raw=${raw.byteLength}B header="${magic.replace(/\0/g, "\\0")}"`);

  if (!magic.startsWith("SQLite format 3")) {
    console.error("FAIL: payload is not a valid SQLite database");
    process.exit(1);
  }
  if (raw.byteLength < 1024) {
    console.error(`FAIL: decompressed DB suspiciously small (${raw.byteLength}B)`);
    process.exit(1);
  }

  // Test the no-secret-configured path (clear env, expect 500).
  delete process.env.BACKUP_SECRET;
  const r4 = await check("BACKUP_SECRET unset (should 500)", { "x-backup-secret": "anything" });
  if (r4.status !== 500) { console.error("FAIL: expected 500"); process.exit(1); }

  console.log("\n✅ Backup endpoint smoke test passed.\n");
})();
