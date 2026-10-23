/**
 * Single source of truth for "can this user open /members?" (2026-10-15).
 *   admin  : email in ADMIN_EMAILS (verified email only)
 *   comp   : row in D1 comp_access for the email (verified email only) - permanent, no Stripe, no cap, no revenue
 *   subscription : active Stripe subscription (hasMemberAccess)
 * Admin/comp need a verified email so nobody can claim a privileged address by signing up first.
 */
import { adminEmails } from "./config";
import { hasMemberAccess } from "./access";
import { type D1Database, type SubscriptionRow, type UserRow, getLatestSubscription } from "./db";
import { isEmailVerified } from "./verify";

export type Entitlement = {
  access: boolean;
  kind: "admin" | "comp" | "subscription" | "none";
  sub: SubscriptionRow | null;
};

export async function getEntitlement(db: D1Database, user: UserRow): Promise<Entitlement> {
  const sub = await getLatestSubscription(db, user.id);
  const email = user.email.trim().toLowerCase();
  if (isEmailVerified(user)) {
    if (adminEmails().includes(email)) return { access: true, kind: "admin", sub };
    try {
      const row = await db.prepare("SELECT email FROM comp_access WHERE email = ?").bind(email).first();
      if (row) return { access: true, kind: "comp", sub };
    } catch {
      /* comp_access table missing: ignore, fall through to subscription */
    }
  }
  if (hasMemberAccess(sub)) return { access: true, kind: "subscription", sub };
  return { access: false, kind: "none", sub };
}
