import { getActiveEvents, getFormats } from "@/lib/events";

const FORMAT_COLORS: Record<string, string> = {
  Commander: "bg-purple-100 text-purple-800",
  Modern: "bg-blue-100 text-blue-800",
  Standard: "bg-green-100 text-green-800",
  Pioneer: "bg-orange-100 text-orange-800",
  Legacy: "bg-red-100 text-red-800",
  Pauper: "bg-yellow-100 text-yellow-800",
  Draft: "bg-cyan-100 text-cyan-800",
  Sealed: "bg-pink-100 text-pink-800",
};

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const params = await searchParams;
  const formats = getFormats();
  const events = getActiveEvents({
    format: params.format || undefined,
    from: new Date().toISOString().split("T")[0],
  });

  // Group events by date
  const grouped: Record<string, typeof events> = {};
  for (const ev of events) {
    if (!grouped[ev.date]) grouped[ev.date] = [];
    grouped[ev.date].push(ev);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">MTG Events — Philadelphia</h1>
        <p className="text-gray-500 mt-1">
          {events.length} upcoming events within 10 miles
        </p>
      </header>

      {/* Format filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/"
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            !params.format ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </a>
        {formats.map((f) => (
          <a
            key={f}
            href={`/?format=${encodeURIComponent(f)}`}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              params.format === f
                ? "bg-gray-900 text-white"
                : (FORMAT_COLORS[f] || "bg-gray-100 text-gray-700") + " hover:opacity-80"
            }`}
          >
            {f}
          </a>
        ))}
      </div>

      {/* Subscribe link */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <strong>Subscribe to this calendar:</strong>{" "}
        Add <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">/calendar</code> to Google Calendar or Apple Calendar via &quot;From URL&quot;
      </div>

      {/* Events by date */}
      {Object.keys(grouped).length === 0 && (
        <p className="text-gray-500 text-center py-12">No upcoming events found.</p>
      )}

      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-3">
            {formatDateHeading(date)}
          </h2>
          <div className="space-y-3">
            {dayEvents.map((ev) => (
              <div key={ev.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${FORMAT_COLORS[ev.format] || "bg-gray-100 text-gray-700"}`}>
                        {ev.format || "MTG"}
                      </span>
                      <span className="text-sm text-gray-500">{formatTime(ev.time)} UTC</span>
                    </div>
                    <h3 className="font-medium text-gray-900">{ev.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {ev.location}{ev.address && ` — ${ev.address}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-medium ${ev.cost === "Free" ? "text-green-600" : "text-gray-700"}`}>
                      {ev.cost || "—"}
                    </span>
                    {ev.detail_url && (
                      <div className="mt-1">
                        <a href={ev.detail_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          Details &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <footer className="mt-12 pt-6 border-t text-center text-sm text-gray-400">
        Powered by <a href="https://github.com/i1986o/mtg-cal" className="text-blue-500 hover:underline">mtg-cal</a>
        {" — "}Data from Wizards of the Coast &amp; Discord
      </footer>
    </main>
  );
}
