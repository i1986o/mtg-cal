import { getDb } from "@/lib/db";
import { geocodeFirstMatch } from "@/lib/geocode";

/**
 * Re-derive event lat/lng from the address column.
 *
 * By default this only fixes rows that are *missing* coords (NULL). Pass
 * `--source-prefix discord` (or any prefix) to also overwrite events from a
 * given source — useful for cleaning up rows that inherited a stale or
 * wrong-region GUILD_COORDS fallback from `scrapers/discord.ts`.
 *
 * Geocoder fallthrough: tries Mapbox first if NEXT_PUBLIC_MAPBOX_TOKEN /
 * MAPBOX_TOKEN is set, falls back to OpenStreetMap Nominatim (free, no key).
 *
 * Usage:
 *   npx tsx --env-file=.env cli/backfill-event-coords.ts                       # missing coords only
 *   npx tsx --env-file=.env cli/backfill-event-coords.ts --limit 25
 *   npx tsx --env-file=.env cli/backfill-event-coords.ts --dry-run
 *   npx tsx --env-file=.env cli/backfill-event-coords.ts --source-prefix discord  # also re-derive existing Discord rows
 */

interface CliArgs {
  limit?: number;
  dryRun: boolean;
  sourcePrefix?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--source-prefix") out.sourcePrefix = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const db = getDb();
  // Two modes:
  //  - default: only rows where lat/lng IS NULL
  //  - --source-prefix X: also include rows whose `source` starts with X
  //    (so we can re-derive coords for existing Discord events with bad fallback values)
  const baseClause = `address IS NOT NULL AND address != '' AND status != 'skip'`;
  const sql = args.sourcePrefix
    ? `SELECT id, address, location, latitude, longitude, source FROM events
       WHERE ${baseClause} AND ((latitude IS NULL OR longitude IS NULL) OR source LIKE ?)`
    : `SELECT id, address, location, latitude, longitude, source FROM events
       WHERE ${baseClause} AND (latitude IS NULL OR longitude IS NULL)`;
  const params = args.sourcePrefix ? [`${args.sourcePrefix}%`] : [];
  let rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    address: string;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    source: string;
  }>;
  if (args.limit != null) rows = rows.slice(0, args.limit);

  const scope = args.sourcePrefix ? ` (scope: missing-coords + source LIKE '${args.sourcePrefix}%')` : "";
  console.log(`[geocode-backfill] ${rows.length} event(s) in scope${scope}${args.dryRun ? " (dry-run)" : ""}`);

  const update = db.prepare("UPDATE events SET latitude = ?, longitude = ? WHERE id = ?");
  let succeeded = 0;
  let failed = 0;
  let unchanged = 0;

  for (const row of rows) {
    // Address alone first (cleanest for Nominatim), then the richer
    // "venue name, address" combo as a fallback (helps for TopDeck's coarse
    // "city, state" addresses where the venue name carries the specificity).
    const candidates = [row.address, row.location ? `${row.location}, ${row.address}` : null];
    const result = await geocodeFirstMatch(candidates);
    if (!result) {
      console.log(`  ✗ ${row.id} — geocode returned no match for "${row.address}"`);
      failed++;
    } else {
      const before =
        row.latitude != null && row.longitude != null
          ? `${row.latitude.toFixed(4)},${row.longitude.toFixed(4)}`
          : "null";
      const after = `${result.latitude.toFixed(4)},${result.longitude.toFixed(4)}`;
      const changed = before !== after;
      if (changed) {
        console.log(`  ✓ ${row.id} ${before} → ${after} (${result.provider ?? "?"})`);
        if (!args.dryRun) update.run(result.latitude, result.longitude, row.id);
        succeeded++;
      } else {
        console.log(`  · ${row.id} unchanged (${after})`);
        unchanged++;
      }
    }
    // Polite pacing — Nominatim asks for ≤1 rps; Mapbox is fine but no harm.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(
    `[geocode-backfill] done — ${succeeded} updated, ${unchanged} unchanged, ${failed} unresolved`,
  );
}

main().catch((err) => {
  console.error("[geocode-backfill] fatal:", err);
  process.exit(1);
});
