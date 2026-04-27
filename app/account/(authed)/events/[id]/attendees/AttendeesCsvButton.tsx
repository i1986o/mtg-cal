"use client";
import { Button } from "@/app/button";
import type { AttendeeRow } from "@/lib/event-rsvps";

export default function AttendeesCsvButton({
  eventId,
  eventTitle,
  attendees,
}: {
  eventId: string;
  eventTitle: string;
  attendees: AttendeeRow[];
}) {
  function download() {
    const header = ["status", "name", "email", "rsvp_at"];
    const rows = attendees.map((a) => [
      a.status,
      a.name ?? "",
      a.email,
      a.created_at,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(eventTitle) || eventId}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button onClick={download} disabled={attendees.length === 0} title="Download as CSV">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      CSV
    </Button>
  );
}

function csvCell(s: string): string {
  // Quote any cell that contains a comma, quote, or newline; double-up internal quotes.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
