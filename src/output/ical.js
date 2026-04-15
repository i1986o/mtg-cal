import ical from "ical-generator";
import fs from "fs";
import path from "path";
import { config } from "../../config.js";

function formatLocationString(loc) {
  return [loc.name, loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
}

function buildDescription(event) {
  const lines = [`Format: ${event.format}`];
  if (event.cost) lines.push(`Cost: ${event.cost}`);
  if (event.location.website) lines.push(`Store Website: ${event.location.website}`);
  if (event.location.storeUrl) lines.push(`Store Details: ${event.location.storeUrl}`);
  if (event.detailUrl) lines.push(`Event Details: ${event.detailUrl}`);
  if (event.description) lines.push(`\n${event.description}`);
  lines.push(`Source: ${event.source}`);
  return lines.join("\n");
}

function writeCalendar(events, filePath, name, description) {
  const cal = ical({
    name,
    description,
    prodId: { company: "mtg-cal", product: "mtg-event-aggregator", language: "EN" },
  });

  for (const event of events) {
    const end = event.endDate || new Date(event.startDate.getTime() + 3 * 60 * 60 * 1000);

    cal.createEvent({
      id: event.id,
      summary: `[${event.format}] ${event.title}`,
      description: buildDescription(event),
      location: formatLocationString(event.location),
      start: event.startDate,
      end,
      floating: false,
      url: event.detailUrl || undefined,
    });
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, cal.toString());
  return events.length;
}

// Map format names from the API to short slugs for filenames
const FORMAT_SLUGS = {
  "Commander": "commander",
  "Modern": "modern",
  "Standard": "standard",
  "Pauper": "pauper",
  "Pioneer": "pioneer",
  "Legacy": "legacy",
  "Booster Draft": "draft",
  "Sealed Deck": "sealed",
};

export function generateIcal(events) {
  const outDir = path.dirname(path.resolve(config.output.icsFile));

  // 1. All events calendar
  const allPath = path.resolve(config.output.icsFile);
  writeCalendar(events, allPath, config.output.calendarName, config.output.calendarDescription);

  // 2. Per-format calendars
  const formats = {};
  for (const event of events) {
    const fmt = event.format || "Other";
    if (!formats[fmt]) formats[fmt] = [];
    formats[fmt].push(event);
  }

  const written = [];
  for (const [fmt, fmtEvents] of Object.entries(formats).sort((a, b) => b[1].length - a[1].length)) {
    const slug = FORMAT_SLUGS[fmt] || fmt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filePath = path.join(outDir, `mtg-${slug}.ics`);
    const city = config.location.city;
    writeCalendar(fmtEvents, filePath, `MTG ${fmt} — ${city}`, `${fmt} events in ${city} area`);
    written.push({ format: fmt, slug, count: fmtEvents.length });
  }

  console.log(`\n✅ Calendars written to: ${outDir}/`);
  console.log(`   mtg-events.ics — ${events.length} events (all formats)`);
  for (const { format, slug, count } of written) {
    console.log(`   mtg-${slug}.ics — ${count} events (${format})`);
  }
}
