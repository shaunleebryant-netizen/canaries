/**
 * Durable backup queue for membership changes. Access does not wait on this.
 * pending is not synced. A missing destination stays pending.
 */
export type BackupStatus = "pending" | "synced" | "failed";

export function marketingOptIn(value: unknown): boolean {
  return value === true;
}

/** A checkout return query never grants access. The webhook entitlement does. */
export function successQueryGrantsAccess(_query: string | undefined): boolean {
  return false;
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
