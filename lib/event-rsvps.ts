import { getDb } from "./db";

/**
 * RSVP layer for the homepage event detail page. Designed to mirror
 * `lib/event-saves.ts` shape — same (user_id, event_id) PK — but with a
 * status enum so we can later layer on waitlist auto-promotion (Tier 1).
 *
 * Capacity races: setRsvp uses a single SQLite transaction (BEGIN IMMEDIATE
 * via better-sqlite3's `db.transaction()` helper, which acquires a reserved
 * lock for writes under WAL). With WAL + reserved-lock semantics there is at
 * most one writer at any moment, so the count-then-insert sequence inside
 * the transaction is atomic from any other writer's perspective.
 */

export type RsvpStatus = "going" | "maybe" | "waitlist" | "cancelled";

export interface RsvpRow {
  user_id: string;
  event_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendeeRow extends RsvpRow {
  email: string;
  name: string | null;
}

export interface RsvpCounts {
  going: number;
  maybe: number;
  waitlist: number;
}

export interface SetRsvpResult {
  ok: true;
  status: RsvpStatus;
  counts: RsvpCounts;
}

export interface SetRsvpFull {
  ok: false;
  reason: "full";
  counts: RsvpCounts;
}

/**
 * Insert/update a user's RSVP for an event, enforcing event-level capacity
 * within the same write transaction so two simultaneous "going" requests
 * can't oversell the event.
 *
 * Returns `{ ok: false, reason: 'full' }` when the requested status would
 * push the going-count past the event's capacity. The caller decides how
 * to surface that — UI shows the user a toast + falls back to "save" or
 * (post-Tier 1) "join waitlist".
 *
 * Special cases:
 *   - status='cancelled' always succeeds (frees a slot).
 *   - status='maybe' is uncapped (capacity only constrains 'going').
 *   - existing RSVP at status='going' switching to a different status
 *     decrements the count; switching back is also bounded by the cap.
 */
export function setRsvp(
  userId: string,
  eventId: string,
  next: RsvpStatus,
): SetRsvpResult | SetRsvpFull {
  const db = getDb();
  const tx = db.transaction((): SetRsvpResult | SetRsvpFull => {
    const event = db
      .prepare("SELECT capacity, rsvp_enabled FROM events WHERE id = ?")
      .get(eventId) as { capacity: number | null; rsvp_enabled: number } | undefined;
    if (!event) throw new Error("event not found");

    const existing = db
      .prepare("SELECT status FROM event_rsvps WHERE user_id = ? AND event_id = ?")
      .get(userId, eventId) as { status: RsvpStatus } | undefined;

    // Capacity check only applies when promoting to 'going'.
    if (next === "going" && event.capacity != null) {
      const goingCount = (db
        .prepare("SELECT COUNT(*) AS n FROM event_rsvps WHERE event_id = ? AND status = 'going'")
        .get(eventId) as { n: number }).n;

      // If the user is already 'going' they don't consume an extra slot;
      // otherwise the new RSVP takes one.
      const wouldAdd = existing?.status === "going" ? 0 : 1;
      if (goingCount + wouldAdd > event.capacity) {
        return { ok: false, reason: "full", counts: countAll(eventId) };
      }
    }

    if (existing) {
      db.prepare(
        "UPDATE event_rsvps SET status = ?, updated_at = datetime('now') WHERE user_id = ? AND event_id = ?",
      ).run(next, userId, eventId);
    } else {
      db.prepare(
        "INSERT INTO event_rsvps (user_id, event_id, status) VALUES (?, ?, ?)",
      ).run(userId, eventId, next);
    }

    return { ok: true, status: next, counts: countAll(eventId) };
  });
  return tx();
}

function countAll(eventId: string): RsvpCounts {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT status, COUNT(*) AS n FROM event_rsvps WHERE event_id = ? AND status IN ('going','maybe','waitlist') GROUP BY status",
    )
    .all(eventId) as { status: string; n: number }[];
  const counts: RsvpCounts = { going: 0, maybe: 0, waitlist: 0 };
  for (const r of rows) {
    if (r.status === "going" || r.status === "maybe" || r.status === "waitlist") {
      counts[r.status] = r.n;
    }
  }
  return counts;
}

/** Public read: returns the current user's RSVP status (if any) plus
 *  active counts. Names are NOT included — host-only via getAttendees. */
export function getRsvpSummary(eventId: string, userId: string | null): {
  myStatus: RsvpStatus | null;
  counts: RsvpCounts;
} {
  const db = getDb();
  let myStatus: RsvpStatus | null = null;
  if (userId) {
    const row = db
      .prepare("SELECT status FROM event_rsvps WHERE user_id = ? AND event_id = ?")
      .get(userId, eventId) as { status: RsvpStatus } | undefined;
    myStatus = row?.status ?? null;
  }
  return { myStatus, counts: countAll(eventId) };
}

/** Host-only: full attendee roster joined to users. */
export function getAttendees(eventId: string): AttendeeRow[] {
  return getDb()
    .prepare(`
      SELECT r.user_id, r.event_id, r.status, r.created_at, r.updated_at,
             u.email, u.name
      FROM event_rsvps r
      JOIN users u ON u.id = r.user_id
      WHERE r.event_id = ?
      ORDER BY
        CASE r.status WHEN 'going' THEN 0 WHEN 'maybe' THEN 1 WHEN 'waitlist' THEN 2 ELSE 3 END,
        r.created_at ASC
    `)
    .all(eventId) as AttendeeRow[];
}

/** Convenience: check if the event is past its date. RSVPs lock once an
 *  event has happened so the count remains a meaningful historical signal. */
export function isPastEvent(date: string): boolean {
  // events.date is YYYY-MM-DD — string compare is correct in this format.
  const today = new Date().toISOString().slice(0, 10);
  return date < today;
}
