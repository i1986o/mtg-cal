"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscordSubscription } from "@/lib/discord-subscriptions";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FORMAT_OPTIONS = ["", "Commander", "Modern", "Standard", "Pioneer", "Legacy", "Pauper", "Draft", "Sealed"];
const SOURCE_OPTIONS = ["", "wizards-locator", "topdeck", "discord"];

export default function SubscriptionsList({ subscriptions }: { subscriptions: DiscordSubscription[] }) {
  return (
    <div className="space-y-4">
      {subscriptions.map(sub => (
        <SubscriptionCard key={sub.id} sub={sub} />
      ))}
    </div>
  );
}

function SubscriptionCard({ sub }: { sub: DiscordSubscription }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    format: sub.format ?? "",
    source: sub.source ?? "",
    radius_miles: sub.radius_miles ?? "",
    near_label: sub.near_label,
    hour_utc: sub.hour_utc,
    dow: sub.dow ?? 1,
    days_ahead: sub.days_ahead,
    lead_minutes: sub.lead_minutes,
  });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/discord/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: form.format || null,
          source: form.source || null,
          radius_miles: form.radius_miles === "" ? null : Number(form.radius_miles),
          near_label: form.near_label,
          hour_utc: Number(form.hour_utc),
          dow: sub.mode === "weekly" ? Number(form.dow) : null,
          days_ahead: Number(form.days_ahead),
          lead_minutes: Number(form.lead_minutes),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/discord/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !sub.enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this subscription? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/discord/${sub.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const tagPills: { label: string; tone?: "muted" | "warn" }[] = [
    { label: sub.mode },
  ];
  if (sub.format) tagPills.push({ label: sub.format });
  if (sub.source) tagPills.push({ label: sub.source });
  if (sub.near_label) tagPills.push({ label: `near ${sub.near_label}${sub.radius_miles ? ` · ${sub.radius_miles}mi` : ""}` });
  if (!sub.enabled) tagPills.push({ label: "disabled", tone: "warn" });

  return (
    <div className={`bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-white/8 rounded-xl p-5 ${!sub.enabled ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {tagPills.map((p, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  p.tone === "warn"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                }`}
              >
                {p.label}
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
            channel <code>#{sub.channel_id}</code>
            {" · "}guild <code>{sub.guild_id}</code>
          </div>
          {sub.mode === "weekly" && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Fires {DOW_LABELS[sub.dow ?? 1]} at {String(sub.hour_utc).padStart(2, "0")}:00 UTC · {sub.days_ahead}d window
            </div>
          )}
          {sub.mode === "daily" && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Fires daily at {String(sub.hour_utc).padStart(2, "0")}:00 UTC · {sub.days_ahead}d window
            </div>
          )}
          {sub.mode === "reminder" && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Fires {sub.lead_minutes} minutes before each matching event ({sub.lead_preset ?? "custom"})
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => setEditing(v => !v)}
            disabled={busy}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={toggleEnabled}
            disabled={busy}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            {sub.enabled ? "Disable" : "Enable"}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs px-2.5 py-1 rounded border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {editing && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 grid grid-cols-2 gap-3 text-sm">
          <Field label="Format">
            <select
              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
              value={form.format}
              onChange={e => setForm({ ...form, format: e.target.value })}
            >
              {FORMAT_OPTIONS.map(o => (
                <option key={o} value={o}>{o || "(any)"}</option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select
              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
              value={form.source}
              onChange={e => setForm({ ...form, source: e.target.value })}
            >
              {SOURCE_OPTIONS.map(o => (
                <option key={o} value={o}>{o || "(any)"}</option>
              ))}
            </select>
          </Field>
          <Field label="Near (label only — coords stay)">
            <input
              type="text"
              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
              value={form.near_label}
              onChange={e => setForm({ ...form, near_label: e.target.value })}
            />
          </Field>
          <Field label="Radius (miles)">
            <input
              type="number"
              min={1}
              max={500}
              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
              value={form.radius_miles}
              onChange={e => setForm({ ...form, radius_miles: e.target.value })}
            />
          </Field>
          {sub.mode !== "reminder" && (
            <Field label="Hour (UTC, 0-23)">
              <input
                type="number"
                min={0}
                max={23}
                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
                value={form.hour_utc}
                onChange={e => setForm({ ...form, hour_utc: Number(e.target.value) })}
              />
            </Field>
          )}
          {sub.mode === "weekly" && (
            <Field label="Day of week">
              <select
                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
                value={form.dow}
                onChange={e => setForm({ ...form, dow: Number(e.target.value) })}
              >
                {DOW_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>{label}</option>
                ))}
              </select>
            </Field>
          )}
          {sub.mode !== "reminder" && (
            <Field label="Days ahead">
              <input
                type="number"
                min={1}
                max={60}
                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
                value={form.days_ahead}
                onChange={e => setForm({ ...form, days_ahead: Number(e.target.value) })}
              />
            </Field>
          )}
          {sub.mode === "reminder" && (
            <Field label="Lead time (minutes)">
              <input
                type="number"
                min={0}
                max={10080}
                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0c1220] text-sm"
                value={form.lead_minutes}
                onChange={e => setForm({ ...form, lead_minutes: Number(e.target.value) })}
              />
            </Field>
          )}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="px-3 py-1.5 rounded border border-gray-200 dark:border-white/15 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
