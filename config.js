// config.js — MTG Calendar settings

export const config = {
  location: {
    zip: "19125",
    city: "Philadelphia",
    state: "PA",
    lat: 39.9526, // Center of Philadelphia (City Hall) for broader coverage
    lng: -75.1652,
  },

  searchRadiusMiles: 8,
  daysAhead: 60,

  // Google Sheet ID — source of truth for event curation
  sheetId: "19jxjKhSSkckuMgIhxM0-QYaiVZ_R6wsZ7nH41l6anC8",

  sources: {
    wizardsLocator: true,
    spicerack: false,
  },

  output: {
    icsFile: "./output/mtg-events.ics",
    calendarName: "MTG Events — Philadelphia",
    calendarDescription: "Local MTG events in Philadelphia area",
  },

  formatFilter: [],
  storeAllowlist: [],
  storeBlocklist: [],
};
