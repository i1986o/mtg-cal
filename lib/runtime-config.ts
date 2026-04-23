import { config as defaults } from "./config";
import { getSetting, setSetting } from "./events";

export interface RuntimeConfig {
  location: { zip: string; city: string; state: string; lat: number; lng: number };
  searchRadiusMiles: number;
  daysAhead: number;
  sources: {
    wizardsLocator: boolean;
    topdeck: boolean;
    discord: { guildIds: string[] };
  };
  output: typeof defaults.output;
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getConfig(): RuntimeConfig {
  return {
    location: safeParse(getSetting("config_location"), defaults.location),
    searchRadiusMiles: Number(getSetting("config_radius_miles") || defaults.searchRadiusMiles),
    daysAhead: Number(getSetting("config_days_ahead") || defaults.daysAhead),
    sources: {
      wizardsLocator: getSetting("config_source_wizardslocator") !== "0",
      topdeck: getSetting("config_source_topdeck") !== "0",
      discord: {
        guildIds: safeParse(getSetting("config_source_discord_guilds"), defaults.sources.discord.guildIds),
      },
    },
    output: defaults.output,
  };
}

export function updateConfig(patch: Partial<{
  location: RuntimeConfig["location"];
  searchRadiusMiles: number;
  daysAhead: number;
  sourceWizardsLocator: boolean;
  sourceTopdeck: boolean;
  sourceDiscordGuilds: string[];
}>): RuntimeConfig {
  if (patch.location) setSetting("config_location", JSON.stringify(patch.location));
  if (patch.searchRadiusMiles != null) setSetting("config_radius_miles", String(patch.searchRadiusMiles));
  if (patch.daysAhead != null) setSetting("config_days_ahead", String(patch.daysAhead));
  if (patch.sourceWizardsLocator != null) setSetting("config_source_wizardslocator", patch.sourceWizardsLocator ? "1" : "0");
  if (patch.sourceTopdeck != null) setSetting("config_source_topdeck", patch.sourceTopdeck ? "1" : "0");
  if (patch.sourceDiscordGuilds) setSetting("config_source_discord_guilds", JSON.stringify(patch.sourceDiscordGuilds));
  return getConfig();
}
