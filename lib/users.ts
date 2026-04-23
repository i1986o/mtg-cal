import { getDb } from "./db";

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "admin" | "organizer" | "user";
  suspended: 0 | 1;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface UserWithCounts extends UserRecord {
  event_count: number;
}

const VALID_ROLES = new Set(["admin", "organizer", "user"]);

export function listUsers(filters?: { role?: string; q?: string }): UserWithCounts[] {
  const db = getDb();
  let sql = `
    SELECT u.*, (SELECT COUNT(*) FROM events WHERE owner_id = u.id) AS event_count
    FROM users u
  `;
  const wheres: string[] = [];
  const params: string[] = [];
  if (filters?.role && VALID_ROLES.has(filters.role)) {
    wheres.push("u.role = ?");
    params.push(filters.role);
  }
  if (filters?.q) {
    wheres.push("(u.email LIKE ? OR u.name LIKE ?)");
    const q = `%${filters.q}%`;
    params.push(q, q);
  }
  if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
  sql += " ORDER BY u.created_at DESC";
  return db.prepare(sql).all(...params) as UserWithCounts[];
}

export function getUser(id: string): UserRecord | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRecord | undefined;
}

export function updateUser(id: string, patch: { role?: string; suspended?: boolean; name?: string }): UserRecord | undefined {
  const db = getDb();
  const existing = getUser(id);
  if (!existing) return undefined;
  const role = patch.role && VALID_ROLES.has(patch.role) ? patch.role : existing.role;
  const suspended = patch.suspended === undefined ? existing.suspended : (patch.suspended ? 1 : 0);
  const name = patch.name ?? existing.name;
  db.prepare("UPDATE users SET role=?, suspended=?, name=?, updated_at=datetime('now') WHERE id=?").run(role, suspended, name, id);
  // When suspending, also nuke active sessions so the next request fails auth.
  if (suspended === 1 && existing.suspended === 0) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  return getUser(id);
}

export function revokeSessions(userId: string): number {
  const r = getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return r.changes;
}

export function getUserSessions(userId: string): { session_token: string; expires: number }[] {
  return getDb()
    .prepare("SELECT session_token, expires FROM sessions WHERE user_id = ? ORDER BY expires DESC")
    .all(userId) as { session_token: string; expires: number }[];
}
