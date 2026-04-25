export const FORMAT_EMOJI: Record<string, string> = {
  Commander: "\u2694\uFE0F",
  Modern: "\u26A1",
  Standard: "\u2B50",
  Pioneer: "\uD83E\uDE90",
  Legacy: "\uD83D\uDC51",
  Pauper: "\uD83E\uDE99",
  Draft: "\uD83C\uDFB2",
  Sealed: "\uD83C\uDF81",
};

export const FORMAT_BADGE: Record<string, string> = {
  Commander: "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
  Modern: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  Standard: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
  Pioneer: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30",
  Legacy: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
  Pauper: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30",
  Draft: "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30",
  Sealed: "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30",
};

export const FORMAT_DOT: Record<string, string> = {
  Commander: "bg-purple-500",
  Modern: "bg-blue-500",
  Standard: "bg-green-500",
  Pioneer: "bg-orange-500",
  Legacy: "bg-red-500",
  Pauper: "bg-yellow-500",
  Draft: "bg-cyan-500",
  Sealed: "bg-pink-500",
};

export const FORMAT_BADGE_DEFAULT =
  "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30";

export const FORMAT_EMOJI_DEFAULT = "\uD83C\uDCCF";

/**
 * Canonical format list shown in the event-form dropdown. Matches what the
 * scrapers emit today (see scrapers/discord.ts extractFormat and WotC API
 * format names) so admin-submitted and scraped events share one vocabulary.
 * The form still accepts free-text for one-off formats.
 */
export const FORMAT_SUGGESTIONS = [
  "Commander",
  "Modern",
  "Standard",
  "Pioneer",
  "Legacy",
  "Pauper",
  "Draft",
  "Sealed",
  "Dungeons and Dragons Event",
  "New Player Event",
] as const;
