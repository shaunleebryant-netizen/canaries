/**
 * Isolated preview entitlement. NOT a production security control.
 *
 * Honoured only when CANARY_PREVIEW_TIER=1 and NODE_ENV is not production.
 * Otherwise every cookie is ignored (fail closed). Existing account
 * entitlements are resolved separately and are never downgraded by this cookie.
 * The client cannot set the tier: the cookie is httpOnly and HMAC-signed,
 * and the sign function refuses to run when the flag is off.
 */
import { b64url, b64urlDecode, hmacSign, hmacVerify } from "./crypto";

export const PREVIEW_TIER_COOKIE = "canary_preview_tier";

export type PreviewTierName = "free" | "paid";

export type PreviewTierPayload = {
  tier: PreviewTierName;
  email: string;
  exp: number;
};

const DEV_SECRET = "preview-tier-not-for-production";

export function previewTierEnabled(): boolean {
  return process.env.CANARY_PREVIEW_TIER === "1" && process.env.NODE_ENV !== "production";
}

function secret(): string {
  return process.env.CANARY_PREVIEW_TIER_SECRET || DEV_SECRET;
}

export async function signPreviewTier(p: PreviewTierPayload): Promise<string> {
  if (!previewTierEnabled()) {
    throw new Error("Preview tier signing is disabled");
  }
  const body = b64url(new TextEncoder().encode(JSON.stringify(p)));
  return `${body}.${await hmacSign(body, secret())}`;
}

export async function readPreviewTier(token: string | undefined, nowSec = Math.floor(Date.now() / 1000)): Promise<PreviewTierPayload | null> {
  if (!previewTierEnabled() || !token) return null;
  const i = token.indexOf(".");
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!(await hmacVerify(body, sig, secret()))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as PreviewTierPayload;
    if (p.tier !== "free" && p.tier !== "paid") return null;
    if (typeof p.email !== "string" || !p.email.includes("@")) return null;
    if (typeof p.exp !== "number" || p.exp <= nowSec) return null;
    return p;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Marketing consent is stored only when the boolean true is sent. Omitted, strings, and 1 do not opt in. */
export function parseFreeSignup(body: unknown): { ok: true; email: string; marketing: boolean } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing details" };
  const rec = body as Record<string, unknown>;
  const email = typeof rec.email === "string" ? rec.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Enter a valid email" };
  return { ok: true, email, marketing: rec.marketing === true };
}

export type ConsentRecord = { email: string; marketing: boolean; updatedAt: string };

export function applyConsent(rows: ConsentRecord[], email: string, marketing: boolean, nowIso: string): ConsentRecord[] {
  const next = rows.filter((r) => r.email !== email);
  next.push({ email, marketing, updatedAt: nowIso });
  return next;
}

export function unsubscribeEmail(rows: ConsentRecord[], email: string, nowIso: string): ConsentRecord[] {
  return applyConsent(rows, email.trim().toLowerCase(), false, nowIso);
}
