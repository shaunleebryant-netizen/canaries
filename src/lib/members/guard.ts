import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { accountsEnabled } from "./config";
import { getMembersDb } from "./db";
import { getEntitlement } from "./entitlement";
import { getCurrentUser } from "./session";
import { isEmailVerified } from "./verify";

/** /members page guard. Stub mode: no-op (middleware cookie check unchanged). */
export async function requireMemberAccessPage(): Promise<void> {
  if (!accountsEnabled()) return;
  const cur = await getCurrentUser();
  if (!cur) redirect("/account/login?next=/members");
  // Phase 1: email must be verified before subscription access counts for /members.
  if (!isEmailVerified(cur.user)) redirect("/account/verify?next=/members");
  const ent = await getEntitlement(await getMembersDb(), cur.user); // admin / comp / paid
  if (!ent.access) redirect("/account?gate=members");
}

/** /api/members/* guard. Returns a response to send, or null to continue. Stub mode: null. */
export async function memberApiGuard(): Promise<NextResponse | null> {
  if (!accountsEnabled()) return null;
  const cur = await getCurrentUser();
  if (!cur) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isEmailVerified(cur.user)) {
    return NextResponse.json({ error: "Email verification required" }, { status: 403 });
  }
  const ent = await getEntitlement(await getMembersDb(), cur.user);
  if (!ent.access) return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  return null;
}

/** For /account* routes & pages: 404 unless accounts mode is on. */
export function accountsOr404(): NextResponse | null {
  return accountsEnabled() ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
}
