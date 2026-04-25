"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geocodeAddress } from "@/lib/geocode";
import { FORMAT_SUGGESTIONS } from "@/lib/format-style";
import VenueAutocomplete, { type Venue } from "./VenueAutocomplete";
import FormatCombobox from "./FormatCombobox";

export interface EventFormValues {
  id?: string;
  title: string;
  format: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  address: string;
  cost: string;
  store_url: string;
  detail_url: string;
  latitude: string;
  longitude: string;
  status: string;
  notes: string;
}

const EMPTY: EventFormValues = {
  title: "", format: "", date: "", time: "", timezone: "America/New_York",
  location: "", address: "", cost: "", store_url: "", detail_url: "",
  latitude: "", longitude: "", status: "active", notes: "",
};

const FIELD = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

/**
 * Stored cost strings use "Free" or "$N" (matches scraper output). Parse into
 * a {paid, amount} pair for the UI, then serialize back on change.
 */
function parseCost(stored: string): { paid: boolean; amount: string } {
  const s = (stored ?? "").trim();
  if (!s) return { paid: false, amount: "" };
  if (/^free$/i.test(s)) return { paid: false, amount: "" };
  const m = s.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (m) return { paid: true, amount: m[1] };
  return { paid: true, amount: s }; // fallback — preserve whatever was stored
}

function serializeCost(paid: boolean, amount: string): string {
  if (!paid) return "Free";
  const a = amount.trim();
  if (!a) return ""; // treat "paid but no amount entered" as unspecified
  return `$${a}`;
}

export default function EventForm({
  initial,
  endpoint,
  method,
  redirectTo,
  showStatus = true,
}: {
  initial?: Partial<EventFormValues>;
  endpoint: string;          // e.g. "/api/admin/events" for POST or "/api/admin/events/<id>" for PATCH
  method: "POST" | "PATCH";
  redirectTo: string;        // path to navigate to after save
  showStatus?: boolean;      // organizer flow hides this and forces 'active'
}) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [venueFilled, setVenueFilled] = useState(false);
  const geoToken = useRef(0);

  // Cost UI state — derived from values.cost but kept local so "Paid with no
  // amount yet" doesn't immediately write an empty string back.
  const initialCost = parseCost(values.cost);
  const [costPaid, setCostPaid] = useState<boolean>(initialCost.paid);
  const [costAmount, setCostAmount] = useState<string>(initialCost.amount);

  function field<K extends keyof EventFormValues>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  function updateCost(nextPaid: boolean, nextAmount: string) {
    setCostPaid(nextPaid);
    setCostAmount(nextAmount);
    setValues((v) => ({ ...v, cost: serializeCost(nextPaid, nextAmount) }));
  }

  // Pulled from a known venue suggestion — fill in the details we have, but
  // don't overwrite fields the user has already typed manually (except the
  // hidden coordinates, which are always plumbing).
  function applyVenue(venue: Venue) {
    setValues((v) => ({
      ...v,
      location: venue.name,
      address: v.address.trim() ? v.address : venue.address,
      store_url: v.store_url.trim() ? v.store_url : venue.store_url,
      latitude: venue.latitude != null ? String(venue.latitude) : v.latitude,
      longitude: venue.longitude != null ? String(venue.longitude) : v.longitude,
    }));
    setVenueFilled(true);
  }

  // Auto-look-up coordinates when the address leaves focus. Users never see
  // lat/lng — we use them behind the scenes for distance filtering.
  async function lookupAddress() {
    const address = values.address.trim();
    if (!address) return;
    const myToken = ++geoToken.current;
    const result = await geocodeAddress(address);
    if (myToken !== geoToken.current) return;
    if (result) {
      setValues((v) => ({
        ...v,
        latitude: String(result.latitude),
        longitude: String(result.longitude),
      }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...values,
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
    };
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Save failed (${res.status})`);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Field label="Title" required>
        <input className={FIELD} value={values.title} onChange={field("title")} required />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Date" required>
          <input className={FIELD} type="date" value={values.date} onChange={field("date")} required />
        </Field>
        <Field label="Time">
          <input className={FIELD} type="time" value={values.time} onChange={field("time")} placeholder="HH:MM" />
        </Field>
        <Field label="Format">
          <FormatCombobox
            value={values.format}
            onChange={(next) => setValues((v) => ({ ...v, format: next }))}
            options={FORMAT_SUGGESTIONS}
            className={FIELD}
            placeholder="Start typing…"
          />
        </Field>
      </div>

      <Field
        label="Location (venue name)"
        hint={
          venueFilled
            ? "We filled in what we know. Edit anything that's changed."
            : "Start typing — we'll suggest venues we already know."
        }
      >
        <VenueAutocomplete
          value={values.location}
          onChange={(next) => {
            setValues((v) => ({ ...v, location: next }));
            if (venueFilled) setVenueFilled(false);
          }}
          onPick={applyVenue}
          className={FIELD}
          placeholder="e.g. Hamilton's Hand"
        />
      </Field>

      <Field label="Address">
        <input className={FIELD} value={values.address} onChange={field("address")} onBlur={lookupAddress} />
      </Field>

      <Field label="Cost">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="cost-kind"
              checked={!costPaid}
              onChange={() => updateCost(false, costAmount)}
            />
            Free
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="cost-kind"
              checked={costPaid}
              onChange={() => updateCost(true, costAmount)}
            />
            Paid
          </label>
          <div className={`flex items-center gap-1 transition ${costPaid ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <span className="text-gray-500 dark:text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={costAmount}
              onChange={(e) => updateCost(costPaid, e.target.value)}
              placeholder="5"
              aria-label="Price in dollars"
              className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Venue website"
          hint="Optional. The store, bar, or club's main site — e.g. hamiltons.com."
        >
          <input
            className={FIELD}
            type="url"
            value={values.store_url}
            onChange={field("store_url")}
            placeholder="https://"
          />
        </Field>
        <Field
          label="Event detail URL"
          hint="Optional. Link directly to this event's registration or info page, if different from the venue site."
        >
          <input
            className={FIELD}
            type="url"
            value={values.detail_url}
            onChange={field("detail_url")}
            placeholder="https://"
          />
        </Field>
      </div>

      {showStatus && (
        <Field label="Status">
          <select className={FIELD} value={values.status} onChange={field("status")}>
            <option value="active">active</option>
            <option value="skip">skip</option>
            <option value="pinned">pinned</option>
            <option value="pending">pending</option>
          </select>
        </Field>
      )}

      <Field label="Description">
        <textarea className={FIELD} rows={3} value={values.notes} onChange={field("notes")} />
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}
