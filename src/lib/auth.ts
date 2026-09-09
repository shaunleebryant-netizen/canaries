import { cookies } from "next/headers";

export const MEMBERS_COOKIE = "canary_members";

export function expectedMembersPassword(): string {
  return process.env.MEMBERS_PASSWORD || "canary-dev";
}

export async function isMembersAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(MEMBERS_COOKIE)?.value;
  if (!token) return false;
  // Stub: cookie value is the password itself (not production-hardened).
  return token === expectedMembersPassword();
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
