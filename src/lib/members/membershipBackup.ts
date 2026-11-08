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

/** Sheet push is the only success. No credential and no HTTP receiver both leave the row unfinished. */
export function backupOutcomeAfterSheetPush(input: {
  pushed: boolean;
  credentialMissing: boolean;
  attempts: number;
  maxAttempts?: number;
}): { status: BackupStatus; attempts: number; complete: boolean; unresolved: string | null } {
  if (input.credentialMissing) {
    return { status: "pending", attempts: input.attempts, complete: false, unresolved: "GOOGLE_SERVICE_ACCOUNT_JSON" };
  }
  if (!input.pushed) {
    const next = applyBackupAttempt(input.attempts, false, input.maxAttempts ?? 5);
    return { ...next, complete: false, unresolved: null };
  }
  return { status: "synced", attempts: input.attempts + 1, complete: true, unresolved: null };
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
