"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RsvpStatus = "going" | "maybe" | "waitlist" | "cancelled";

interface Counts { going: number; maybe: number; waitlist: number }

interface Props {
  eventId: string;
  signedIn: boolean;
  pastEvent: boolean;
  capacity: number | null;
  initialStatus: RsvpStatus | null;
  initialCounts: Counts;
  initialWaitlistPosition: number | null;
}

const SEG_BASE =
  "px-3 py-1.5 text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

export default function RsvpButton({
  eventId,
  signedIn,
  pastEvent,
  capacity,
  initialStatus,
  initialCounts,
  initialWaitlistPosition,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus);
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [waitlistPos, setWaitlistPos] = useState<number | null>(initialWaitlistPosition);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  // The "Full" state only kicks in for the 'going' choice when the user
  // isn't already going. Maybe is always available (uncapped).
  const isFull = capacity != null && counts.going >= capacity && status !== "going";

  async function setRsvp(next: RsvpStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("This event is full");
          if (json.counts) setCounts(json.counts);
        } else {
          setError(json.error || "Something went wrong");
        }
        return;
      }
      setStatus(next === "cancelled" ? null : next);
      setCounts(json.counts);
      setWaitlistPos(typeof json.waitlistPosition === "number" ? json.waitlistPosition : null);
      // Server-render refresh in case the user got auto-promoted.
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  if (pastEvent) {
    return <CountPill counts={counts} capacity={capacity} suffix=" went" />;
  }

  if (!signedIn) {
    return (
      <div className="flex items-center gap-2">
        <CountPill counts={counts} capacity={capacity} />
        <Link
          href={`/account/login?from=${encodeURIComponent(`/event/${eventId}`)}`}
          className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/8 shadow-sm text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
        >
          Sign in to RSVP
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <CountPill counts={counts} capacity={capacity} />
        <div className="inline-flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-stone-900">
          {status === "waitlist" ? (
            // While on the waitlist, the primary CTA is "Going" but it's
            // disabled until a spot opens. We keep "Maybe" available so the
            // user can drop the waitlist and downgrade.
            <button
              type="button"
              disabled
              className={`${SEG_BASE} bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300`}
              aria-pressed="true"
            >
              Waitlist {waitlistPos != null ? `· #${waitlistPos}` : ""}
            </button>
          ) : isFull ? (
            <button
              type="button"
              onClick={() => setRsvp("waitlist")}
              disabled={busy || pending}
              className={`${SEG_BASE} text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10`}
            >
              Join waitlist
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRsvp("going")}
              disabled={busy || pending}
              aria-pressed={status === "going"}
              className={`${SEG_BASE} ${
                status === "going"
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              Going
            </button>
          )}
          <button
            type="button"
            onClick={() => setRsvp("maybe")}
            disabled={busy || pending}
            aria-pressed={status === "maybe"}
            className={`${SEG_BASE} border-l border-gray-200 dark:border-white/10 ${
              status === "maybe"
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            Maybe
          </button>
          {status && (
            <button
              type="button"
              onClick={() => setRsvp("cancelled")}
              disabled={busy || pending}
              title={status === "waitlist" ? "Leave waitlist" : "Cancel RSVP"}
              aria-label={status === "waitlist" ? "Leave waitlist" : "Cancel RSVP"}
              className={`${SEG_BASE} border-l border-gray-200 dark:border-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function CountPill({
  counts,
  capacity,
  suffix = " going",
}: {
  counts: Counts;
  capacity: number | null;
  suffix?: string;
}) {
  const text =
    capacity != null
      ? `${counts.going} / ${capacity}${suffix}`
      : `${counts.going}${suffix}`;
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium tabular-nums">
      {text}
    </span>
  );
}
