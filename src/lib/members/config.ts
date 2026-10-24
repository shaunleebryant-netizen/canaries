/**
 * Members feature flags. Production (deployed) is ALWAYS accounts mode since 2026-10-15; the local-dev default is the stub.
 *
 *   MEMBERS_AUTH_MODE=stub      (default)  existing shared-password cookie; all /account* routes 404
 *   MEMBERS_AUTH_MODE=accounts             per-user accounts + Stripe subscription gate on /members
 *
 * NEVER put MEMBERS_AUTH_MODE / STRIPE_MOCK in .env.local or .dev.vars — OpenNext bundles
 * env files into the deployed worker. Pass them as shell env vars for local testing,
 * or as Worker vars/secrets on ship day.
 */
export type MembersAuthMode = "stub" | "accounts";

export function membersAuthMode(): MembersAuthMode {
  // 2026-10-15 go-live: the shared-password stub can NEVER run in production builds (deployed Worker),
  // whatever MEMBERS_AUTH_MODE says. Local `next dev` still defaults to the stub for previews.
  if (process.env.NODE_ENV === "production") return "accounts";
  return process.env.MEMBERS_AUTH_MODE === "accounts" ? "accounts" : "stub";
}

export function accountsEnabled(): boolean {
  return membersAuthMode() === "accounts";
}

/**
 * Local-only Stripe mock (no Stripe API calls; signed test events posted to our own
 * webhook handler). Hard-disabled in production builds.
 */
export function stripeMockEnabled(): boolean {
  return (
    accountsEnabled() &&
    process.env.STRIPE_MOCK === "1" &&
    process.env.NODE_ENV !== "production"
  );
}

export function stripeKeyMode(): "none" | "test" | "live" | "unknown" {
  const k = process.env.STRIPE_SECRET_KEY || "";
  if (!k) return "none";
  if (k.startsWith("sk_test_") || k.startsWith("rk_test_")) return "test";
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) return "live";
  return "unknown";
}

/**
 * "Test mode" = mock or a Stripe test key. Only in test mode do we reveal the password
 * reset link on screen (email sending is stubbed — no email is ever sent).
 */
export function membersTestMode(): boolean {
  return stripeMockEnabled() || stripeKeyMode() === "test";
}

/** Live keys are refused until the owner explicitly allows them (ship day). */
export function liveStripeAllowed(): boolean {
  return process.env.MEMBERS_ALLOW_LIVE_STRIPE === "1";
}

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 32) {
    throw new Error("SESSION_SECRET missing or too short (need >= 32 chars) for accounts mode");
  }
  return s;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function siteOrigin(request: Request): string {
  return process.env.MEMBERS_SITE_ORIGIN || new URL(request.url).origin;
}

export const SESSION_COOKIE = "canary_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const RESET_TTL_SECONDS = 60 * 60;
export const VERIFY_TTL_SECONDS = 60 * 60 * 24; // email verify link TTL
/** Founding-plan cap (default 100). MEMBERS_FIRST_100_CAP override exists for local testing. */
export const FIRST_100_CAP = (() => {
  const n = Number(process.env.MEMBERS_FIRST_100_CAP ?? 100);
  return Number.isFinite(n) && n >= 0 ? n : 100;
})();

/** Google OAuth (Phase 2). Missing → start route returns owner-setup message; do not invent secrets. */
export function googleOAuthEnv(): { clientId: string; clientSecret: string; configured: boolean } {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}
