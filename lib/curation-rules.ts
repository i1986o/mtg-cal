// Auto-curation rules — pure functions that classify a freshly-scraped event
// into a status. Applied during upsert (lib/scraper.ts) so we don't have to
// hand-review every new row at nationwide scale. Manual overrides (pinned,
// admin-set skip) are preserved by the upsert path itself, not here.

import type { ScrapedEvent } from "@/scrapers";

/** Title fragments that indicate this isn't an MTG event. WotC's locator and
 *  TopDeck both occasionally surface other-game tournaments hosted at the
 *  same store. Match is case-insensitive against the event title. */
const NON_MTG_KEYWORDS = [
  /\byu-?gi-?oh\b/i,
  /\bpok[eé]mon\b/i,
  /\bwarhammer\b/i,
  /\bflesh ?and ?blood\b/i,
  /\blorcana\b/i,
  /\bone ?piece\b/i,
  /\bdigimon\b/i,
  /\bd&d\b|\bdungeons ?& ?dragons\b/i,
  /\bstar ?wars\b.*\bunlimited\b/i,
];

/** Source identifiers we trust to publish directly (scraper output → active).
 *  Anything else (Discord, user-submitted) lands as `pending` for review. */
const TRUSTED_SOURCES = new Set(["wizards-locator", "topdeck"]);

export type AutoStatus = "active" | "skip" | "pending";

export interface CurationDecision {
  status: AutoStatus;
  reason: string;
}

export function classifyEvent(ev: ScrapedEvent): CurationDecision {
  // 1. Hard rule: non-MTG keyword in the title → skip.
  const title = ev.title || "";
  for (const re of NON_MTG_KEYWORDS) {
    if (re.test(title)) {
      return { status: "skip", reason: `non-MTG keyword (${re.source})` };
    }
  }

  // 2. Honor an explicit status from the scraper itself (e.g. discord scraper
  // already tags user-submitted events as "pending"). Don't override.
  if (ev.status === "pending") {
    return { status: "pending", reason: "scraper marked pending" };
  }

  // 3. Trusted source → active. Everything else → pending.
  if (TRUSTED_SOURCES.has(ev.source)) {
    return { status: "active", reason: "trusted source" };
  }
  return { status: "pending", reason: `untrusted source: ${ev.source}` };
}
