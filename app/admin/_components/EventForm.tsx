"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geocodeAddress } from "@/lib/geocode";

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
  const geoToken = useRef(0);

  function field<K extends keyof EventFormValues>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
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
          <input className={FIELD} value={values.format} onChange={field("format")} placeholder="Commander, Modern, …" />
        </Field>
      </div>

      <Field label="Location (venue name)">
        <input className={FIELD} value={values.location} onChange={field("location")} />
      </Field>

      <Field label="Address">
        <input className={FIELD} value={values.address} onChange={field("address")} onBlur={lookupAddress} />
      </Field>

      <Field label="Cost">
        <input className={FIELD} value={values.cost} onChange={field("cost")} placeholder="$5, Free, …" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Store URL">
          <input className={FIELD} type="url" value={values.store_url} onChange={field("store_url")} />
        </Field>
        <Field label="Detail URL">
          <input className={FIELD} type="url" value={values.detail_url} onChange={field("detail_url")} />
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
