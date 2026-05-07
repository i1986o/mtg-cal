// Unit-style smoke test for /api/internal/integrity. Mirrors the pattern
// in cli/smoke-test-backup.ts.

process.env.BACKUP_SECRET = "test-secret-abc-123";

import { GET } from "@/app/api/internal/integrity/route";

(async () => {
  console.log("=== /api/internal/integrity smoke test ===\n");

  async function call(name: string, headers: Record<string, string>) {
    const req = new Request("http://localhost/api/internal/integrity", { method: "GET", headers });
    const res = await GET(req);
    const body = await res.json();
    console.log(`  ${name}: status=${res.status} body=${JSON.stringify(body).slice(0, 200)}`);
    return { res, body };
  }

  const r1 = await call("no header (should 401)", {});
  if (r1.res.status !== 401) { console.error("FAIL: expected 401"); process.exit(1); }

  const r2 = await call("wrong secret (should 401)", { "x-backup-secret": "wrong" });
  if (r2.res.status !== 401) { console.error("FAIL: expected 401"); process.exit(1); }

  const r3 = await call("correct secret (should 200 + ok=true)", { "x-backup-secret": "test-secret-abc-123" });
  if (r3.res.status !== 200) { console.error("FAIL: expected 200"); process.exit(1); }
  if (r3.body.ok !== true) { console.error("FAIL: expected ok=true on a healthy DB"); process.exit(1); }
  if (!Array.isArray(r3.body.findings) || r3.body.findings[0] !== "ok") {
    console.error("FAIL: expected findings === ['ok']");
    process.exit(1);
  }
  if (typeof r3.body.durationMs !== "number") {
    console.error("FAIL: expected durationMs to be a number");
    process.exit(1);
  }

  delete process.env.BACKUP_SECRET;
  const r4 = await call("BACKUP_SECRET unset (should 500)", { "x-backup-secret": "anything" });
  if (r4.res.status !== 500) { console.error("FAIL: expected 500"); process.exit(1); }

  console.log("\n✅ Integrity endpoint smoke test passed.\n");
})();
