/**
 * Durable backup queue for membership changes. Access does not wait on this.
 * The release backup is a verified file in the private Canary Dashboard Backups Drive folder.
 * scripts/membership-drive-backup.mjs marks rows only after that verification.
 * A sheet push and a finished export do not mark rows synced.
 */
export type BackupStatus = "pending" | "synced" | "failed";

export function marketingOptIn(value: unknown): boolean {
  return value === true;
}

/** A checkout return query never grants access. The webhook entitlement does. */
export function successQueryGrantsAccess(_query: string | undefined): boolean {
  return false;
}

/** A sheet push never completes the Drive backup. The row stays pending for the next verified snapshot. */
export function backupOutcomeAfterSheetPush(input: {
  pushed: boolean;
  attempts: number;
}): { status: BackupStatus; attempts: number; complete: boolean } {
  void input.pushed;
  return { status: "pending", attempts: input.attempts, complete: false };
}

/** Ids read before the sheet snapshot. Later rows, and rows already synced, are excluded. */
export function outboxIdsCoveredBySnapshot(
  rows: readonly { id: string; status: string; created_at: number }[],
  snapshotAt: number,
): string[] {
  return rows
    .filter((row) => (row.status === "pending" || row.status === "failed") && row.created_at <= snapshotAt)
    .map((row) => row.id);
}

export function applyBackupAttempt(
  attempts: number,
  ok: boolean,
  maxAttempts = 5,
): { status: BackupStatus; attempts: number } {
  const next = attempts + 1;
  if (ok) return { status: "synced", attempts: next };
  if (next >= maxAttempts) return { status: "failed", attempts: next };
  return { status: "pending", attempts: next };
}
