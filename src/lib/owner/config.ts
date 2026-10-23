/**
 * Owner-only area (/owner/*, /api/owner/*). Protected twice:
 *   1. Cloudflare Access (Zero Trust) self-hosted app in front of canarydashboard.com/owner and /api/owner
 *      (policy: only OWNER_EMAIL, one-time PIN login).
 *   2. The Worker verifies the Cf-Access-Jwt-Assertion header (RS256 vs the team certs, AUD, issuer,
 *      expiry, email) and answers 404 otherwise — so if Access is missing/misconfigured the area stays dark.
 *
 * Worker vars (not secrets — both are public identifiers):
 *   OWNER_ACCESS_TEAM_DOMAIN  e.g. https://<team>.cloudflareaccess.com
 *   OWNER_ACCESS_AUD          the Access application's AUD tag
 * Unset → every /owner request is 404 (fail closed).
 */
export const OWNER_EMAIL = "shaunleebryant@gmail.com";

export type OwnerAccessConfig = { teamDomain: string; aud: string; email: string };

export function ownerAccessConfig(): OwnerAccessConfig | null {
  const teamDomain = (process.env.OWNER_ACCESS_TEAM_DOMAIN || "").trim().replace(/\/+$/, "");
  const aud = (process.env.OWNER_ACCESS_AUD || "").trim();
  if (!teamDomain || !aud) return null;
  const prodOk = /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(teamDomain);
  // Local simulated-JWT checks only: a loopback JWKS server. Never accepted in production builds.
  const devOk = process.env.NODE_ENV !== "production" && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(teamDomain);
  if (!prodOk && !devOk) return null;
  return { teamDomain, aud, email: OWNER_EMAIL };
}
