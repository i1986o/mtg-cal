// config.ts — MTG Calendar settings

export const config = {
  location: {
    zip: "19125",
    city: "Philadelphia",
    state: "PA",
    lat: 39.9688,
    lng: -75.1246,
  },

  searchRadiusMiles: 10,
  daysAhead: 60,

  sources: {
    wizardsLocator: true,
    topdeck: true,
    discord: {
      guildIds: ["1451305700322967794"], // Hamilton's Hand
    },
  },

  output: {
    icsFile: "./output/mtg-events.ics",
    calendarName: "PlayIRL.GG — Philadelphia",
    calendarDescription: "MTG events near Philadelphia via PlayIRL.GG",
  },
};
