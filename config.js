// config.js — Edit this file to customize your MTG calendar

export const config = {
  // --- Search settings ---
  // Your location (used for WotC locator searches)
  location: {
    zip: "19125",           // Your Philly zip (Fishtown)
    city: "Philadelphia",
    state: "PA",
    lat: 39.9688,            // latitude  (find yours at latlong.net)
    lng: -75.1246,           // longitude
  },

  // How far to search for events (miles)
  searchRadiusMiles: 5,

  // How many days ahead to fetch events
  daysAhead: 60,

  // --- Sources to enable ---
  sources: {
    wizardsLocator: true,   // WotC official locator (locator.wizards.com)
  },

  // --- Output settings ---
  output: {
    icsFile: "./output/mtg-events.ics",
    calendarName: "MTG Events — Philadelphia (5mi)",
    calendarDescription: "Local Magic: The Gathering events within 5 miles of Philadelphia, aggregated from WotC locator and other sources",
  },

  formatFilter: [],
  storeAllowlist: [],
  storeBlocklist: [],
};
