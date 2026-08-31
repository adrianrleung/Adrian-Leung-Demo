import { getPool } from "./adapters/postgres";
import type { User } from "./users";

export interface AuditEntry {
  id: number;
  app: string;
  row_id: string;
  actor_id: string;
  actor_name: string;
  event: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Append-only audit trail.
 *
 * The table grants only INSERT and SELECT to the application role (see
 * db/schema.sql), so a compromised app cannot rewrite history. There is
 * deliberately no update or delete function in this module.
 */
export async function record(
  app: string,
  rowId: string,
  user: User,
  event: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await getPool().query(
    `INSERT INTO audit_log (app, row_id, actor_id, actor_name, event, detail)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [app, rowId, user.id, user.name, event, detail ? JSON.stringify(detail) : null],
  );
}

export async function history(app: string, rowId: string): Promise<AuditEntry[]> {
  const result = await getPool().query(
    `SELECT * FROM audit_log WHERE app = $1 AND row_id = $2
     ORDER BY created_at DESC, id DESC LIMIT 50`,
    [app, rowId],
  );
  return result.rows as AuditEntry[];
}
