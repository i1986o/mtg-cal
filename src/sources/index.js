import { config } from "../../config.js";
import { validateEvents } from "./schema.js";

// Source registry — add new sources here (one line each).
// Each value is a lazy loader returning the module's default export.
const SOURCE_MODULES = {
  wizardsLocator: () => import("./wizards-locator.js"),
};

export async function fetchAllSources() {
  const all = [];

  for (const [name, loader] of Object.entries(SOURCE_MODULES)) {
    const sourceConfig = config.sources[name];

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
    } catch (err) {
      console.error(`[sources] ${name} FAILED:`, err.message);
    }
  }

  return all;
}
