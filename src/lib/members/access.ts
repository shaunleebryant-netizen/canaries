import type { SubscriptionRow } from "./db";

/** Owner default (2026-09-25): 7-day grace while past_due. Override with MEMBERS_PAST_DUE_GRACE_DAYS. */
export function pastDueGraceSeconds(): number {
  const d = Number(process.env.MEMBERS_PAST_DUE_GRACE_DAYS ?? 7);
  return (Number.isFinite(d) && d >= 0 ? d : 7) * 86400;
}

/**
 * Access policy (owner): "unsubscribe" = turn off auto-renew,
 * access continues until the end of the paid term.
 *  - active / trialing AND now < current_period_end  -> access
 *  - cancel_at_period_end does NOT remove access early
 *  - past_due (failed renewal) -> access for a 7-day grace from past_due_since, then locked
 *  - unpaid / canceled (subscription deleted) / incomplete -> no access
 */
export function hasMemberAccess(sub: SubscriptionRow | null | undefined, now = Math.floor(Date.now() / 1000)): boolean {
  if (!sub) return false;
  if (sub.status === "past_due") {
    const since = sub.past_due_since ?? sub.last_payment_failed_at;
    return since != null && now < since + pastDueGraceSeconds();
  }
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (!sub.current_period_end) return false;
  return now < sub.current_period_end;
}

/** Seconds of grace left (for display), or null when not in grace. */
export function graceEndsAt(sub: SubscriptionRow | null | undefined): number | null {
  if (!sub || sub.status !== "past_due") return null;
  const since = sub.past_due_since ?? sub.last_payment_failed_at;
  return since != null ? since + pastDueGraceSeconds() : null;
}
