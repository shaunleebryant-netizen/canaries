/**
 * Durable backup queue for membership changes. Access does not wait on this.
 * The backup destination is the existing Canary Members Google Sheet, written only by
 * scripts/export-members-sheet.mjs --remote --push. pending is not a completed backup.
 * A missing service-account file does not mark rows synced.
 */
export type BackupStatus = "pending" | "synced" | "failed";

export function marketingOptIn(value: unknown): boolean {
  return value === true;
}

/** A checkout return query never grants access. The webhook entitlement does. */
export function successQueryGrantsAccess(_query: string | undefined): boolean {
  return false;
}

/** Sheet push is the only success. A missing key leaves every covered row pending. A failed push stays retryable. */
export function backupOutcomeAfterSheetPush(input: {
  pushed: boolean;
  credentialMissing: boolean;
  attempts: number;
}): { status: BackupStatus; attempts: number; complete: boolean; unresolved: string | null } {
  if (input.credentialMissing || !input.pushed) {
    return {
      status: "pending",
      attempts: input.credentialMissing ? input.attempts : input.attempts + 1,
      complete: false,
      unresolved: input.credentialMissing ? "GOOGLE_SERVICE_ACCOUNT_JSON" : null,
    };
  }
  return { status: "synced", attempts: input.attempts + 1, complete: true, unresolved: null };
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
