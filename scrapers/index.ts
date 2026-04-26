import { getConfig } from "@/lib/runtime-config";
import { listEnabledDiscordSources } from "@/lib/user-sources";
import { validateEvents } from "./schema";
import type { DiscordGuildSpec } from "./discord";

// Source registry — add new sources here (one line each).
const SOURCE_MODULES: Record<string, () => Promise<any>> = {
  wizardsLocator: () => import("./wizards-locator"),
  topdeck: () => import("./topdeck"),
  discord: () => import("./discord"),
};

export interface ScrapedEvent {
  id: string;
  title: string;
  format: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  address: string;
  cost: string;
  store_url: string;
  detail_url: string;
  source: string;
  latitude?: number | null;
  longitude?: number | null;
  // Optional — used by user-connected sources (e.g. private Discord servers).
  owner_id?: string | null;
  source_type?: string;
  status?: "active" | "pending";
  /** Cover image URL provided by the source (e.g. Discord CDN). */
  image_url?: string;
  /**
   * Where lat/lng came from. `"source"` means a per-event API gave them to us
   * (trust). `"guild_fallback"` means we used a hardcoded or guild-wide
   * default (don't trust — re-geocode the address at upsert). `"none"` means
   * we have no coords at all. Defaults to `"source"` when omitted.
   */
  coords_source?: "source" | "guild_fallback" | "none";
}

export async function fetchAllSources(): Promise<ScrapedEvent[]> {
  const all: ScrapedEvent[] = [];
  const cfg = getConfig();

  for (const [name, loader] of Object.entries(SOURCE_MODULES)) {
    const sourceConfig = (cfg.sources as any)[name];

    // Skip disabled sources
    if (!sourceConfig) continue;
    if (sourceConfig === false) continue;
    if (typeof sourceConfig === "object" && sourceConfig.enabled === false) continue;

    const opts: any = typeof sourceConfig === "object" ? { ...sourceConfig } : {};

    // Merge user-connected Discord sources into the discord scraper's input.
    if (name === "discord") {
      let userGuilds: DiscordGuildSpec[] = [];
      try {
        userGuilds = listEnabledDiscordSources().map((s) => ({
          guildId: s.external_id,
          ownerId: s.user_id,
          venueName: s.venue_name,
          venueAddress: s.venue_address,
          latitude: s.latitude,
          longitude: s.longitude,
        }));
      } catch (err: any) {
        console.error("[sources] discord user_sources lookup FAILED:", err.message);
      }
      if (userGuilds.length > 0) {
        opts.guilds = userGuilds;
        console.log(`[sources] discord: +${userGuilds.length} user-connected guild(s)`);
      }
    }

    try {
      const mod = await loader();
      const fetchFn = mod.default || mod[Object.keys(mod)[0]];
      const events = await fetchFn(opts);
      const validated = validateEvents(events, name);
      all.push(...validated);
      console.log(`[sources] ${name}: ${validated.length} events`);
    } catch (err: any) {
      console.error(`[sources] ${name} FAILED:`, err.message);
    }
  }

  return all;
}
