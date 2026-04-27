import { randomBytes, randomUUID } from "crypto";
import { getDb } from "./db";

/**
 * Per-event invite tokens. Used to grant read access to private events
 * before the recipient has RSVPed. The owner (host) generates one or more
 * tokens via the host portal, sends the resulting URL to whoever they want
 * to invite, and the recipient clicks it. The page bypasses the visibility
 * gate for that event when a valid token is presented in the query string.
 *
 * Tokens stay valid until the host deletes them, even after a redeem —
 * `used_by` records the first redeemer for audit but doesn't disable the
 * token. Scopes match plan-mode design doc Tier 1.
 */

export interface InviteRow {
  id: string;
  event_id: string;
  token: string;
  label: string;
  created_by: string | null;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
}

export interface InviteWithRedeemer extends InviteRow {
  used_by_email: string | null;
  used_by_name: string | null;
}

/** Generate a fresh invite token for an event. Returns the inserted row. */
export function createInvite({
  eventId,
  createdBy,
  label = "",
}: {
  eventId: string;
  createdBy: string;
  label?: string;
}): InviteRow {
  const db = getDb();
  const id = randomUUID();
  // 24 bytes → 32 base64url chars. Long enough that a random URL guess
  // won't redeem (collision odds: ~2^192).
  const token = randomBytes(24).toString("base64url");
  db.prepare(
    `INSERT INTO event_invites (id, event_id, token, label, created_by) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, eventId, token, label, createdBy);
  return getInvite(id)!;
}

export function getInvite(id: string): InviteRow | undefined {
  return getDb()
    .prepare("SELECT * FROM event_invites WHERE id = ?")
    .get(id) as InviteRow | undefined;
}

/** Look up an invite by its public token. */
export function findInviteByToken(token: string): InviteRow | undefined {
  if (!token) return undefined;
  return getDb()
    .prepare("SELECT * FROM event_invites WHERE token = ?")
    .get(token) as InviteRow | undefined;
}

/** Host-only: every invite for an event, with redeemer info if any. Newest first. */
export function listInvites(eventId: string): InviteWithRedeemer[] {
  return getDb()
    .prepare(
      `
      SELECT i.*, u.email AS used_by_email, u.name AS used_by_name
      FROM event_invites i
      LEFT JOIN users u ON u.id = i.used_by
      WHERE i.event_id = ?
      ORDER BY i.created_at DESC
      `,
    )
    .all(eventId) as InviteWithRedeemer[];
}

/** Mark an invite as redeemed by the given user. First-redeemer-wins —
 *  later redeems by other users still grant access (token stays valid)
 *  but don't overwrite the audit field. */
export function redeemInvite(token: string, userId: string): void {
  getDb()
    .prepare(
      `UPDATE event_invites
         SET used_by = ?, used_at = datetime('now')
         WHERE token = ? AND used_by IS NULL`,
    )
    .run(userId, token);
}

/** Host-only: revoke an invite by id. */
export function deleteInvite(id: string): boolean {
  const r = getDb().prepare("DELETE FROM event_invites WHERE id = ?").run(id);
  return r.changes > 0;
}
