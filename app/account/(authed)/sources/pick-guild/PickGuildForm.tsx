"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BotGuild } from "@/lib/discord-bot";

interface Form {
  venue_name: string;
  venue_address: string;
  latitude: string;
  longitude: string;
}

export default function PickGuildForm({ guilds }: { guilds: BotGuild[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState<Form>({ venue_name: "", venue_address: "", latitude: "", longitude: "" });
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGuild = guilds.find((g) => g.id === selected);

  async function geocode() {
    if (!form.venue_address.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", form.venue_address);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString(), {
        headers: { "Accept-Language": "en" },
      });
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data.length === 0) {
        setError("Couldn't find that address. Enter lat/long manually.");
      } else {
        setForm((f) => ({ ...f, latitude: data[0].lat, longitude: data[0].lon }));
      }
    } catch {
      setError("Geocoding failed. Enter lat/long manually.");
    } finally {
      setGeocoding(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuild) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/sources/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guild_id: selectedGuild.id,
        label: selectedGuild.name,
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Failed to connect server.");
      setBusy(false);
      return;
    }
    router.push("/account/sources");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Server
        </label>
        <div className="space-y-1.5 max-h-64 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          {guilds.map((g) => (
            <label
              key={g.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer ${
                selected === g.id
                  ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="guild"
                value={g.id}
                checked={selected === g.id}
                onChange={() => setSelected(g.id)}
                className="shrink-0"
              />
              <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">{g.name}</span>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{g.id}</span>
            </label>
          ))}
        </div>
      </div>

      <fieldset disabled={!selected} className="space-y-4 disabled:opacity-50">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Venue name (optional)
          </label>
          <input
            type="text"
            value={form.venue_name}
            onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
            placeholder="Hamilton's Hand"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Venue address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.venue_address}
              onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
              placeholder="226 Walnut St, Philadelphia, PA 19106"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={geocode}
              disabled={!form.venue_address || geocoding}
              className="text-xs px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {geocoding ? "Finding…" : "Geocode"}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used to show these events within the local radius filter on the homepage.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Latitude
            </label>
            <input
              type="text"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              placeholder="39.9518"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Longitude
            </label>
            <input
              type="text"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="-75.1849"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
            />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!selected || busy}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
        >
          {busy ? "Connecting…" : "Connect server"}
        </button>
      </div>
    </form>
  );
}
