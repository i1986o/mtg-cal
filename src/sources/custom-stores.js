// src/sources/custom-stores.js -- FUTURE SOURCE
const STORES = [];
export async function fetchCustomStoreEvents() {
  if (STORES.length === 0) { console.log("[custom-stores] No stores configured -- skipping."); return []; }
  return [];
}
