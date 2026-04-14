// config.js — MTG Calendar settings

export const config = {
  location: {
    zip: "19125",
    city: "Philadelphia",
    state: "PA",
    lat: 39.9688,
    lng: -75.1246,
  },

  searchRadiusMiles: 5,
  daysAhead: 60,

  // Google Sheet ID — source of truth for event curation
  sheetId: "19jxjKhSSkckuMgIhxM0-QYaiVZ_R6wsZ7nH41l6anC8",

  sources: {
    wizardsLocator: true,
    spicerack: false,
  },

  output: {
    icsFile: "./output/mtg-events.ics",
    calendarName: "MTG Events — Philadelphia (5mi)",
    calendarDescription: "Local MTG events within 5 miles of Philadelphia",
  },

  formatFilter: [],
  storeAllowlist: [],
  storeBlocklist: [],
};
