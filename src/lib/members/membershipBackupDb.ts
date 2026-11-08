import type { D1Database } from "./db";
import { nowSec } from "./db";
import { applyBackupAttempt } from "./membershipBackup";

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
 * Deliver pending rows. No MEMBERSHIP_BACKUP_URL means they stay pending.
 * A failed delivery stays pending until the attempt limit, then failed.
 */
export async function flushMembershipBackups(db: D1Database, limit = 20): Promise<{ synced: number; pending: number; failed: number }> {
  const counts = { synced: 0, pending: 0, failed: 0 };
  let rows: BackupRow[] = [];
  try {
    const listed = await db
      .prepare("SELECT id, event_id, user_id, subscription_id, event_type, status, attempts, last_error FROM membership_backup_outbox WHERE status = 'pending' ORDER BY created_at LIMIT ?")
      .bind(limit)
      .all<BackupRow>();
    rows = listed.results ?? [];
  } catch {
    return counts;
  }
  const url = process.env.MEMBERSHIP_BACKUP_URL || "";
  for (const row of rows) {
    let ok = false;
    let error = "MEMBERSHIP_BACKUP_URL is not configured";
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(process.env.MEMBERSHIP_BACKUP_TOKEN ? { authorization: `Bearer ${process.env.MEMBERSHIP_BACKUP_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            eventId: row.event_id,
            userId: row.user_id,
            subscriptionId: row.subscription_id,
            eventType: row.event_type,
          }),
        });
        ok = res.ok;
        error = ok ? "" : `HTTP ${res.status}`;
      } catch (e) {
        error = e instanceof Error ? e.message : "backup request failed";
      }
    }
    const next = applyBackupAttempt(row.attempts, ok);
    if (!ok && !url) {
      counts.pending += 1;
      continue;
    }
    await db
      .prepare("UPDATE membership_backup_outbox SET status = ?, attempts = ?, last_error = ?, updated_at = ? WHERE id = ?")
      .bind(next.status, next.attempts, ok ? null : error.slice(0, 300), nowSec(), row.id)
      .run();
    counts[next.status] += 1;
  }
  return counts;
}
