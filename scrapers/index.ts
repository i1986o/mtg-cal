import { config } from "@/lib/config";
import { validateEvents } from "./schema";

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
}

export async function fetchAllSources(): Promise<ScrapedEvent[]> {
  const all: ScrapedEvent[] = [];

  for (const [name, loader] of Object.entries(SOURCE_MODULES)) {
    const sourceConfig = (config.sources as any)[name];

    // Skip disabled sources
    if (!sourceConfig) continue;
    if (sourceConfig === false) continue;
    if (typeof sourceConfig === "object" && sourceConfig.enabled === false) continue;

    const opts = typeof sourceConfig === "object" ? sourceConfig : {};

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
