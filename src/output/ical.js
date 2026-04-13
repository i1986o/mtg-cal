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

export function generateIcal(events) {
  // No calendar-level timezone — we write all timestamps as UTC (with Z suffix)
  // so every calendar app converts to the user's local time automatically.
  const cal = ical({
    name: config.output.calendarName,
    description: config.output.calendarDescription,
    prodId: { company: "mtg-cal", product: "mtg-event-aggregator", language: "EN" },
  });

  for (const event of events) {
    // startDate is already a JS Date (parsed from the UTC ISO string from WotC).
    // Default duration: 3 hours.
    const end = event.endDate || new Date(event.startDate.getTime() + 3 * 60 * 60 * 1000);

    cal.createEvent({
      id: event.id,
      summary: `[${event.format}] ${event.title}`,
      description: buildDescription(event),
      location: formatLocationString(event.location),
      // floating: false forces ical-generator to write DTSTART as UTC (with Z suffix)
      // e.g. DTSTART:20260424T220000Z = 10pm UTC = 6pm Eastern
      start: event.startDate,
      end,
      floating: false,
      url: event.detailUrl || undefined,
    });
  }

  const outPath = path.resolve(config.output.icsFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, cal.toString());
  console.log(`\n✅ Calendar written to: ${outPath}`);
  console.log(`   ${events.length} events total`);
  return outPath;
}
