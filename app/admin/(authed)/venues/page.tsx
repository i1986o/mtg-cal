import { requireRole } from "@/lib/session";
import { listKnownVenues, listVenueDefaults, venueKey } from "@/lib/venues";
import VenueRow from "./VenueRow";

export const dynamic = "force-dynamic";

export default async function AdminVenuesPage() {
  await requireRole("admin");

  const venues = listKnownVenues();
  const defaults = new Map(
    listVenueDefaults().map((d) => [d.venue_key, { image_url: d.image_url, source: d.image_source }] as const),
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
          Venues
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
          Pick a default image for each venue. It's used as the fallback on event cards
          when an event from that venue doesn't have its own photo. Aggregated from every
          known event location plus connected Discord sources.
        </p>
      </header>

      {venues.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No venues yet. Once events have locations, they'll show up here.
        </div>
      ) : (
        <ul className="space-y-2">
          {venues.map((v) => {
            const key = venueKey(v.name);
            const def = defaults.get(key);
            return (
              <VenueRow
                key={key}
                venueName={v.name}
                usageCount={v.usage_count}
                address={v.address}
                initialImageUrl={def?.image_url ?? ""}
                initialImageSource={def?.source ?? null}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
