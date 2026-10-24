import { cookies } from "next/headers";

export const MEMBERS_COOKIE = "canary_members";

export function expectedMembersPassword(): string {
  // Local dev only. In production there is no shared password: accounts mode is always on.
  if (process.env.NODE_ENV === "production") return "";
  return process.env.MEMBERS_PASSWORD || "canary-dev";
}

export async function isMembersAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(MEMBERS_COOKIE)?.value;
  if (!token || !expectedMembersPassword()) return false;
  // Stub: cookie value is the password itself (not production-hardened).
  return token === expectedMembersPassword();
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
