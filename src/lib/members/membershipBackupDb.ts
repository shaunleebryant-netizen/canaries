import type { D1Database } from "./db";
import { nowSec } from "./db";

export type BackupRow = {
  id: string;
  event_id: string;
  user_id: string;
  subscription_id: string | null;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
};

/** Queue one backup. Duplicate event ids are ignored. Failure here must not roll back access. */
export async function enqueueMembershipBackup(
  db: D1Database,
  row: { eventId: string; userId: string; subscriptionId: string | null; eventType: string },
): Promise<"queued" | "duplicate" | "unavailable"> {
  const now = nowSec();
  try {
    const existing = await db.prepare("SELECT id FROM membership_backup_outbox WHERE event_id = ?").bind(row.eventId).first();
    if (existing) return "duplicate";
    await db
      .prepare(
        `INSERT INTO membership_backup_outbox
          (id, event_id, user_id, subscription_id, event_type, status, attempts, last_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
      )
      .bind(`bak_${row.eventId}`, row.eventId, row.userId, row.subscriptionId, row.eventType, now, now)
      .run();
    return "queued";
  } catch {
    return "unavailable";
  }
}

/**
 * Does not upload to Drive and does not mark rows synced.
 * scripts/membership-drive-backup.mjs ack is the only acknowledgement.
 */
export async function flushMembershipBackups(db: D1Database, limit = 20): Promise<{ synced: number; pending: number; failed: number }> {
  void db;
  void limit;
  return { synced: 0, pending: 0, failed: 0 };
}
