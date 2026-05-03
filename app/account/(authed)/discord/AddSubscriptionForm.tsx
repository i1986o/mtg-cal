"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const FORMAT_OPTIONS = ["", "Commander", "Modern", "Standard", "Pioneer", "Legacy", "Pauper", "Draft", "Sealed"];
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEAD_PRESETS: { value: string; label: string }[] = [
  { value: "1h", label: "1 hour before" },
  { value: "2h", label: "2 hours before" },
  { value: "morning_of", label: "Morning of" },
  { value: "day_before", label: "Day before" },
];

/**
 * Build a 24-entry list of hour-of-day options labeled in the viewer's local
 * timezone. The internal `value` is the UTC hour (matches our schema), but
 * the display string is whatever a clock in the user's city would read.
 *
 * SSR-safe: uses Intl APIs that work in any modern browser and Node 16+. The
 * useMemo below only runs on the client, so the dropdown re-localizes if the
 * user changes timezones (e.g. travels with the page open) on next render.
 */
function buildHourOptions(): { utcHour: number; label: string }[] {
  const today = new Date();
  return Array.from({ length: 24 }, (_, utcHour) => {
    const d = new Date(today);
    d.setUTCHours(utcHour, 0, 0, 0);
    return {
      utcHour,
      label: d.toLocaleTimeString([], { hour: "numeric", hour12: true }),
    };
  });
}

function shortTimezoneLabel(): string {
  // Resolve to a 3-4 char abbreviation when possible (EDT / PST / etc), else
  // fall back to the IANA region (Europe/Paris).
  try {
    const parts = new Intl.DateTimeFormat([], { timeZoneName: "short" }).formatToParts(new Date());
    const tz = parts.find(p => p.type === "timeZoneName");
    if (tz?.value) return tz.value;
  } catch {}
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  return "your time";
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  bot_present: boolean;
}

interface Channel {
  id: string;
  name: string;
}

type Mode = "weekly" | "daily" | "reminder";

export default function AddSubscriptionForm({ inviteUrl }: { inviteUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
      >
        + New subscription
      </button>
      {open && (
        <FormModal
          inviteUrl={inviteUrl}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function FormModal({
  inviteUrl,
  onClose,
  onCreated,
}: {
  inviteUrl: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  // -- guilds + channels --
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [guildsLoading, setGuildsLoading] = useState(true);
  const [reauth, setReauth] = useState(false);
  const [guildId, setGuildId] = useState<string>("");

  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelId, setChannelId] = useState<string>("");

  // -- form state --
  const [mode, setMode] = useState<Mode>("weekly");
  const [format, setFormat] = useState("");
  const [near, setNear] = useState("");
  const [radiusMiles, setRadiusMiles] = useState<number | "">("");
  const [hourUtc, setHourUtc] = useState(14);
  const [dow, setDow] = useState(1);
  const [daysAhead, setDaysAhead] = useState(7);
  const [lead, setLead] = useState("1h");
  const [customLeadMinutes, setCustomLeadMinutes] = useState<number | "">("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived once on mount: 24 hour-of-day options labeled in viewer's local
  // timezone (no UTC math forced on the user).
  const hourOptions = useMemo(buildHourOptions, []);
  const tzLabel = useMemo(shortTimezoneLabel, []);
  // First-render seed: prefer a user-friendly default by translating the
  // schema default (14 UTC) into whatever "9am-ish" looks like locally.
  useEffect(() => {
    const today = new Date();
    const ninePm = new Date(today);
    ninePm.setHours(9, 0, 0, 0);
    setHourUtc(ninePm.getUTCHours());
    // intentionally no deps — only on mount; if user picks a time we don't override
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/account/discord/guilds");
        const data = await res.json();
        if (data.reauth) {
          setReauth(true);
        } else if (data.guilds) {
          setGuilds(data.guilds);
          // Auto-pick the first one that has the bot — saves a click.
          const firstWithBot = data.guilds.find((g: Guild) => g.bot_present);
          if (firstWithBot) setGuildId(firstWithBot.id);
        } else {
          setError(data.error ?? "Couldn't load servers.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setGuildsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!guildId) {
      setChannels(null);
      setChannelId("");
      return;
    }
    setChannelsLoading(true);
    setChannels(null);
    setChannelId("");
    void (async () => {
      try {
        const res = await fetch(`/api/account/discord/channels?guild_id=${encodeURIComponent(guildId)}`);
        const data = await res.json();
        if (data.reauth) {
          setReauth(true);
        } else if (data.channels) {
          setChannels(data.channels);
        } else {
          setError(data.error ?? "Couldn't load channels.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setChannelsLoading(false);
      }
    })();
  }, [guildId]);

  const selectedGuild = guilds?.find(g => g.id === guildId);
  const botMissing = selectedGuild && !selectedGuild.bot_present;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const leadArg = mode === "reminder"
        ? (lead === "custom" ? String(customLeadMinutes) : lead)
        : null;
      const res = await fetch("/api/account/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId,
          channel_id: channelId,
          mode,
          format: format || null,
          near: near || null,
          radius_miles: radiusMiles === "" ? null : Number(radiusMiles),
          hour_utc: hourUtc,
          dow: mode === "weekly" ? dow : null,
          days_ahead: daysAhead,
          lead: leadArg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!guildId && !!channelId && !submitting && !botMissing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl bg-white dark:bg-[#0c1220] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-[#0c1220] z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Discord subscription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {reauth ? (
            <ReauthCard />
          ) : (
            <>
              <Section title="Where should events post?">
                <Field label="Server">
                  {guildsLoading ? (
                    <Skeleton />
                  ) : guilds && guilds.length > 0 ? (
                    <select
                      className="input"
                      value={guildId}
                      onChange={e => setGuildId(e.target.value)}
                    >
                      <option value="">— pick a server —</option>
                      {guilds.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}{!g.bot_present ? " (bot not added yet)" : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <NoGuildsCard inviteUrl={inviteUrl} />
                  )}
                </Field>

                {botMissing && inviteUrl && (
                  <div className="rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    The bot isn&apos;t in <strong>{selectedGuild?.name}</strong> yet.{" "}
                    <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      Add it →
                    </a>
                  </div>
                )}

                {guildId && !botMissing && (
                  <Field label="Channel">
                    {channelsLoading ? (
                      <Skeleton />
                    ) : channels && channels.length > 0 ? (
                      <select
                        className="input"
                        value={channelId}
                        onChange={e => setChannelId(e.target.value)}
                      >
                        <option value="">— pick a channel —</option>
                        {channels.map(c => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">No channels found. Make sure the bot can see the channel.</p>
                    )}
                  </Field>
                )}
              </Section>

              <Section title="How often?">
                <div className="grid grid-cols-3 gap-2">
                  <ModeButton current={mode} value="weekly" label="Weekly" sub="One digest per week" onClick={setMode} />
                  <ModeButton current={mode} value="daily" label="Daily" sub="One digest per day" onClick={setMode} />
                  <ModeButton current={mode} value="reminder" label="Per-event" sub="Before each event" onClick={setMode} />
                </div>
              </Section>

              {(mode === "weekly" || mode === "daily") && (
                <Section title={mode === "weekly" ? "When does the digest fire?" : "What time of day?"}>
                  {mode === "weekly" && (
                    <Field label="Day of week">
                      <div className="flex flex-wrap gap-1.5">
                        {DOW_LABELS.map((label, idx) => (
                          <ChipButton key={idx} active={dow === idx} onClick={() => setDow(idx)}>
                            {label}
                          </ChipButton>
                        ))}
                      </div>
                    </Field>
                  )}
                  <Field label={`Time of day (${tzLabel})`}>
                    <select
                      className="input"
                      value={hourUtc}
                      onChange={e => setHourUtc(Number(e.target.value))}
                    >
                      {hourOptions.map(o => (
                        <option key={o.utcHour} value={o.utcHour}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </Section>
              )}

              {mode === "reminder" && (
                <Section title="When should reminders fire?">
                  <div className="flex flex-wrap gap-1.5">
                    {LEAD_PRESETS.map(p => (
                      <ChipButton key={p.value} active={lead === p.value} onClick={() => setLead(p.value)}>
                        {p.label}
                      </ChipButton>
                    ))}
                    <ChipButton active={lead === "custom"} onClick={() => setLead("custom")}>
                      Custom…
                    </ChipButton>
                  </div>
                  {lead === "custom" && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={10080}
                        value={customLeadMinutes}
                        onChange={e => setCustomLeadMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                        className="input w-32"
                        placeholder="Minutes"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">minutes before</span>
                    </div>
                  )}
                </Section>
              )}

              <Section title="Filter the events">
                <Field label="Format (optional)">
                  <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
                    {FORMAT_OPTIONS.map(o => (
                      <option key={o} value={o}>{o || "All formats"}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Near (city, address, or zip)">
                    <input
                      type="text"
                      className="input"
                      value={near}
                      onChange={e => setNear(e.target.value)}
                      placeholder="e.g. Philadelphia, PA"
                    />
                  </Field>
                  <Field label="Radius (miles)">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      className="input"
                      value={radiusMiles}
                      onChange={e => setRadiusMiles(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="(no limit)"
                    />
                  </Field>
                </div>
                {(mode === "weekly" || mode === "daily") && (
                  <Field label="Days ahead to include">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="input"
                      value={daysAhead}
                      onChange={e => setDaysAhead(Number(e.target.value))}
                    />
                  </Field>
                )}
              </Section>

              {error && (
                <div className="rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!reauth && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2 sticky bottom-0 bg-white dark:bg-[#0c1220]">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-md border border-gray-200 dark:border-white/15 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create subscription"}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.625rem;
          border-radius: 0.375rem;
          border: 1px solid var(--input-border, rgb(229 231 235));
          background: var(--input-bg, white);
          font-size: 0.875rem;
        }
        :global(.dark) .input {
          background: #0c1220;
          border-color: rgba(255,255,255,0.15);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ModeButton({
  current,
  value,
  label,
  sub,
  onClick,
}: {
  current: Mode;
  value: Mode;
  label: string;
  sub: string;
  onClick: (m: Mode) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition ${
        active
          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-600"
          : "border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
      }`}
    >
      <div className="font-semibold text-gray-900 dark:text-white">{label}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>
    </button>
  );
}

function ChipButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition ${
        active
          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          : "border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return <div className="h-9 rounded-md bg-gray-100 dark:bg-white/5 animate-pulse" />;
}

function NoGuildsCard({ inviteUrl }: { inviteUrl: string | null }) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-3 text-xs text-gray-600 dark:text-gray-300">
      We couldn&apos;t find any servers where you have <strong>Manage Server</strong> permission.{" "}
      {inviteUrl && (
        <>
          <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">
            Add the bot to a server
          </a>
          {" "}you administer first.
        </>
      )}
    </div>
  );
}

function ReauthCard() {
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-3">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Re-authorize Discord to continue
      </p>
      <p className="text-xs text-amber-800 dark:text-amber-200/80">
        We need permission to read which servers you&apos;re in so you can pick one. Sign in with Discord again — this only takes a click.
      </p>
      <button
        onClick={() => signIn("discord")}
        className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition"
      >
        Sign in with Discord
      </button>
    </div>
  );
}
