import { randomUUID } from "crypto";
import { getDb } from "./db";

export interface AdminActionRow {
  id: string;
  admin_id: string | null;
  target_user_id: string | null;
  target_event_id: string | null;
  action: string;
  reason: string;
  created_at: string;
}

export interface AdminActionWithNames extends AdminActionRow {
  admin_email: string | null;
  admin_name: string | null;
}

export interface LogActionInput {
  admin_id: string;
  target_user_id?: string | null;
  target_event_id?: string | null;
  action: string;
  reason?: string;
}

export function logAdminAction(input: LogActionInput): AdminActionRow {
  const id = randomUUID();
  getDb()
    .prepare(`
      INSERT INTO admin_actions (id, admin_id, target_user_id, target_event_id, action, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.admin_id,
      input.target_user_id ?? null,
      input.target_event_id ?? null,
      input.action,
      input.reason ?? "",
    );
  return getDb().prepare("SELECT * FROM admin_actions WHERE id = ?").get(id) as AdminActionRow;
}

export function getActionsForUser(targetUserId: string, limit = 50): AdminActionWithNames[] {
  return getDb()
    .prepare(`
      SELECT a.*, u.email AS admin_email, u.name AS admin_name
      FROM admin_actions a
      LEFT JOIN users u ON u.id = a.admin_id
      WHERE a.target_user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `)
    .all(targetUserId, limit) as AdminActionWithNames[];
}
