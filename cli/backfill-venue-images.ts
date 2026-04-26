import { listKnownVenues, getVenueDefault } from "@/lib/venues";
import { fetchVenueImage } from "@/lib/venue-image-fetcher";
import { uploadFileExists } from "@/lib/upload-storage";

/**
 * Iterate every venue we already know about and try to attach a real photo.
 * Idempotent: skips venues that already have any image_url, that are flagged
 * `manual`, or whose attempt counter is at the cap. Re-running this after
 * adding GOOGLE_PLACES_API_KEY (or letting time pass) will pick up new tiers.
 *
 * Usage:
 *   npx tsx cli/backfill-venue-images.ts                # process all venues
 *   npx tsx cli/backfill-venue-images.ts --limit 5      # cap iterations
 *   npx tsx cli/backfill-venue-images.ts --dry-run      # don't persist
 *   npx tsx cli/backfill-venue-images.ts --venue "Hobby Vault"  # single venue
 */

const MAX_ATTEMPTS = 3;
const RETRY_DAYS = 30;

interface CliArgs {
  limit?: number;
  dryRun: boolean;
  venue?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--venue") out.venue = argv[++i];
  }
  return out;
}

function shouldSkip(name: string): { skip: boolean; reason?: string } {
  const existing = getVenueDefault(name);
  if (!existing) return { skip: false };
  if (existing.image_source === "manual") return { skip: true, reason: "manual override" };
  if (existing.image_url && uploadFileExists(existing.image_url)) {
    return { skip: true, reason: `already has ${existing.image_source ?? "image"}` };
  }
  if (existing.image_url) {
    // Row claims an image but the file is missing — re-fetch.
    return { skip: false };
  }
  if ((existing.attempt_count ?? 0) >= MAX_ATTEMPTS && existing.last_fetched_at) {
    const ageMs = Date.now() - new Date(existing.last_fetched_at).getTime();
    if (ageMs < RETRY_DAYS * 24 * 60 * 60 * 1000) {
      return { skip: true, reason: `cap reached (${existing.attempt_count} attempts, ${Math.floor(ageMs / 86400000)}d ago)` };
    }
  }
  return { skip: false };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let venues = listKnownVenues();
  if (args.venue) {
    const target = args.venue.toLowerCase().trim();
    venues = venues.filter((v) => v.name.toLowerCase().trim() === target);
    if (venues.length === 0) {
      console.error(`No known venue matches "${args.venue}".`);
      process.exit(1);
    }
  }
  if (args.limit != null) venues = venues.slice(0, args.limit);

  console.log(`[backfill] ${venues.length} venue(s) in scope${args.dryRun ? " (dry-run)" : ""}`);

  let attempted = 0;
  let succeeded = 0;
  let skipped = 0;

  for (const v of venues) {
    const skipCheck = shouldSkip(v.name);
    if (skipCheck.skip) {
      console.log(`  · ${v.name} — skip (${skipCheck.reason})`);
      skipped++;
      continue;
    }
    attempted++;
    const outcome = await fetchVenueImage(
      {
        name: v.name,
        address: v.address,
        store_url: v.store_url || undefined,
        latitude: v.latitude,
        longitude: v.longitude,
      },
      { persist: !args.dryRun },
    );
    if (outcome.source === "none") {
      console.log(`  ✗ ${v.name} — no source produced an image`);
    } else {
      succeeded++;
      console.log(`  ✓ ${v.name} via ${outcome.source}${args.dryRun ? "" : ` → ${outcome.imageUrl}`}`);
    }
    // Polite pacing for external APIs.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(
    `[backfill] done — ${succeeded}/${attempted} attempted produced an image, ${skipped} skipped`,
  );
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
