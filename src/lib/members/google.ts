/**
 * Google OAuth 2.0 + PKCE for members accounts (OpenNext / Cloudflare Workers).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (owner creates the OAuth client — do not invent secrets).
 * Redirect URI: {MEMBERS_SITE_ORIGIN}/api/account/google/callback
 */
import { siteOrigin } from "./config";
import { b64url, hmacSign, hmacVerify, randomToken, sha256Hex } from "./crypto";
import { type D1Database, type UserRow, getUserByEmail, logMemberEvent, nowSec } from "./db";
import { adminEmails } from "./config";

const enc = new TextEncoder();

export const GOOGLE_OAUTH_COOKIE = "canary_google_oauth";
export const GOOGLE_OAUTH_TTL_SECONDS = 600; // 10 minutes

export type GoogleOAuthPending = {
  verifier: string;
  state: string;
  next: string;
  exp: number;
};

export function googleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || "").trim();
}

export function googleClientSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

export function googleOAuthConfigured(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

export function googleCallbackUrl(request: Request): string {
  return `${siteOrigin(request)}/api/account/google/callback`;
}

async function sha256Raw(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

/** PKCE S256 challenge = base64url(SHA256(verifier)). */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(await sha256Raw(verifier));
}

export function newPkceVerifier(): string {
  return randomToken(32);
}

export function newOAuthState(): string {
  return randomToken(24);
}

/** Pack pending OAuth into a signed cookie value (HMAC with SESSION_SECRET). */
export async function sealOAuthPending(pending: GoogleOAuthPending, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(pending)));
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

export async function openOAuthPending(raw: string | undefined, secret: string): Promise<GoogleOAuthPending | null> {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 1) return null;
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  if (!(await hmacVerify(payload, sig, secret))) return null;
  try {
    const pad = payload.length % 4 === 0 ? "" : "=".repeat(4 - (payload.length % 4));
    const bin = atob(payload.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const json = JSON.parse(bin) as GoogleOAuthPending;
    if (!json.verifier || !json.state || !json.exp) return null;
    if (json.exp < nowSec()) return null;
    return json;
  } catch {
    return null;
  }
}

export function googleAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", opts.clientId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", opts.state);
  u.searchParams.set("code_challenge", opts.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("access_type", "online");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export type GoogleTokenResult = {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

export async function exchangeGoogleCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResult> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.codeVerifier,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`google_token_http_${res.status}`);
  }
  return (await res.json()) as GoogleTokenResult;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google_userinfo_http_${res.status}`);
  const j = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };
  if (!j.sub || !j.email) throw new Error("google_profile_incomplete");
  const verified = j.email_verified === true || j.email_verified === "true";
  if (!verified) throw new Error("google_email_unverified");
  return {
    sub: j.sub,
    email: j.email.trim().toLowerCase(),
    email_verified: true,
    name: j.name,
  };
}

/**
 * Upsert member by Google profile.
 * - Match google_sub first; else match email (link password account → both).
 * - Always set email_verified_at (Google verifies email).
 * - New Google-only users: password_hash NULL, auth_provider=google.
 */
export async function upsertGoogleUser(
  db: D1Database,
  profile: GoogleProfile,
): Promise<{ user: UserRow; isNew: boolean; linked: boolean }> {
  const now = nowSec();
  const bySub = await db
    .prepare("SELECT * FROM users WHERE google_sub = ?")
    .bind(profile.sub)
    .first<UserRow>();
  if (bySub) {
    if (bySub.email.toLowerCase() !== profile.email) {
      // Rare Google email change — keep row; update email only if free.
      const clash = await getUserByEmail(db, profile.email);
      if (clash && clash.id !== bySub.id) throw new Error("google_email_conflict");
      await db
        .prepare(
          "UPDATE users SET email = ?, email_verified_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(profile.email, now, now, bySub.id)
        .run();
    } else if (!bySub.email_verified_at) {
      await db
        .prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?")
        .bind(now, now, bySub.id)
        .run();
    }
    await logMemberEvent(db, bySub.id, "login", "google");
    const user = (await db.prepare("SELECT * FROM users WHERE id = ?").bind(bySub.id).first<UserRow>())!;
    return { user, isNew: false, linked: false };
  }

  const existing = await getUserByEmail(db, profile.email);
  if (existing) {
    if (existing.google_sub && existing.google_sub !== profile.sub) {
      throw new Error("google_sub_mismatch");
    }
    const provider = existing.password_hash ? "both" : "google";
    await db
      .prepare(
        "UPDATE users SET google_sub = ?, email_verified_at = ?, auth_provider = ?, updated_at = ? WHERE id = ?",
      )
      .bind(profile.sub, now, provider, now, existing.id)
      .run();
    await logMemberEvent(db, existing.id, "google_linked", existing.password_hash ? "password+google" : "google");
    await logMemberEvent(db, existing.id, "login", "google");
    const user = (await db.prepare("SELECT * FROM users WHERE id = ?").bind(existing.id).first<UserRow>())!;
    return { user, isNew: false, linked: true };
  }

  const id = `usr_${randomToken(12)}`;
  const isAdmin = adminEmails().includes(profile.email) ? 1 : 0;
  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, is_admin, email_verified_at, auth_provider, google_sub, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, 'google', ?, ?, ?)",
    )
    .bind(id, profile.email, isAdmin, now, profile.sub, now, now)
    .run();
  await logMemberEvent(db, id, "signup", "google");
  await logMemberEvent(db, id, "login", "google");
  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>())!;
  return { user, isNew: true, linked: false };
}

/** Stable fingerprint for logging without storing secrets. */
export async function googleClientFingerprint(): Promise<string> {
  const id = googleClientId();
  if (!id) return "missing";
  return (await sha256Hex(id)).slice(0, 12);
}
