/**
 * Email list + inbound leads (D1 table `leads`, migrations/members/0003_leads.sql).
 * Server-only. Never logs raw emails; never returns stored rows to the client.
 */
import { getMembersDb, nowSec, type D1Database } from "@/lib/members/db";
import { emailSendingEnabled, getEmailSender } from "@/lib/email/sender";

export type LeadSource = "letter" | "seminar" | "tuition" | "support";
export type LeadTag = "letter" | "founding_interest" | "seminar" | "tuition" | "support";

export type LeadRow = {
  id: string;
  email: string;
  name: string | null;
  source: string;
  tags: string;
  consent: number;
  status: "pending" | "verified" | "unsubscribed";
  verify_sent_at: number | null;
  unsubscribe_token_hash: string | null;
};

export const LETTER_CONSENT_TEXT =
  "I'd like the free weekly Canary letter by email. I can unsubscribe at any time with one click.";

const VERIFY_TTL_SEC = 7 * 24 * 3600;
const RESEND_GAP_SEC = 10 * 60;

/* ---------- small helpers ---------- */
const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacB64(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

export function normalizeEmail(raw: unknown): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  if (e.length < 6 || e.length > 254) return null;
  // Pragmatic check: one @, no spaces, a dot in the domain, sane TLD.
  if (!/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,24}$/i.test(e)) return null;
  return e;
}

export function clean(raw: unknown, max: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function ipHash(ip: string): Promise<string> {
  const salt = process.env.LEADS_HASH_SALT || "canary-leads-v1";
  return (await sha256Hex(`${salt}:${ip}`)).slice(0, 32);
}

/** Reject cross-site form posts (Origin present and not this host). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetch from older browsers / curl
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/* ---------- rate limit (fixed window, per route + IP) ---------- */
export async function rateLimited(
  db: D1Database,
  route: string,
  ipH: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const now = nowSec();
  const start = now - (now % windowSec);
  const key = `${route}:${ipH}:${start}`;
  const row = await db
    .prepare(
      "INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) " +
        "ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count",
    )
    .bind(key, start + windowSec)
    .first<{ count: number }>();
  if (Math.random() < 0.05) {
    await db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
  }
  return (row?.count ?? 1) > limit;
}

/* ---------- upsert ---------- */
export type SaveLeadInput = {
  email: string;
  name?: string;
  source: LeadSource;
  tags: LeadTag[];
  consent: boolean; // letter consent only
  payload?: Record<string, unknown>;
  ipH: string;
};

export async function saveLead(
  db: D1Database,
  input: SaveLeadInput,
): Promise<{ id: string; isNew: boolean; status: LeadRow["status"]; consent: boolean }> {
  const now = nowSec();
  const existing = await db
    .prepare(
      "SELECT id, email, name, source, tags, consent, status, verify_sent_at, unsubscribe_token_hash FROM leads WHERE email = ?",
    )
    .bind(input.email)
    .first<LeadRow>();

  let id: string;
  let isNew = false;
  let status: LeadRow["status"];
  let consent: boolean;

  if (!existing) {
    id = crypto.randomUUID();
    isNew = true;
    status = "pending";
    consent = input.consent;
    await db
      .prepare(
        "INSERT INTO leads (id, email, name, source, tags, consent, consent_text, consent_at, status, ip_hash, created_at, updated_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
      )
      .bind(
        id,
        input.email,
        input.name || null,
        input.source,
        JSON.stringify([...new Set(input.tags)]),
        input.consent ? 1 : 0,
        input.consent ? LETTER_CONSENT_TEXT : null,
        input.consent ? now : null,
        input.ipH,
        now,
        now,
      )
      .run();
  } else {
    id = existing.id;
    let tags: string[] = [];
    try {
      tags = JSON.parse(existing.tags);
    } catch {
      tags = [];
    }
    const merged = JSON.stringify([...new Set([...tags, ...input.tags])]);
    const newConsent = input.consent && !existing.consent;
    // Fresh explicit consent after an unsubscribe: back to pending (must re-confirm).
    const resubscribe = input.consent && existing.status === "unsubscribed";
    status = resubscribe ? "pending" : existing.status;
    consent = Boolean(existing.consent) || input.consent;
    await db
      .prepare(
        "UPDATE leads SET tags = ?, name = COALESCE(name, ?), " +
          "consent = MAX(consent, ?), consent_text = CASE WHEN ? THEN ? ELSE consent_text END, " +
          "consent_at = CASE WHEN ? THEN ? ELSE consent_at END, " +
          "status = ?, unsubscribed_at = CASE WHEN ? THEN NULL ELSE unsubscribed_at END, " +
          "verified_at = CASE WHEN ? THEN NULL ELSE verified_at END, updated_at = ? WHERE id = ?",
      )
      .bind(
        merged,
        input.name || null,
        input.consent ? 1 : 0,
        newConsent || resubscribe ? 1 : 0,
        LETTER_CONSENT_TEXT,
        newConsent || resubscribe ? 1 : 0,
        now,
        status,
        resubscribe ? 1 : 0,
        resubscribe ? 1 : 0,
        now,
        id,
      )
      .run();
  }

  await db
    .prepare("INSERT INTO lead_submissions (lead_id, source, payload, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, input.source, input.payload ? JSON.stringify(input.payload) : null, input.ipH, now)
    .run();

  console.log(`[leads] saved source=${input.source} new=${isNew} status=${status} consent=${consent ? 1 : 0} lead=${id.slice(0, 8)}`);
  return { id, isNew, status, consent };
}

/* ---------- tokens ---------- */
export async function unsubscribeTokenFor(leadId: string): Promise<string | null> {
  const secret = process.env.EMAIL_TOKEN_SECRET || "";
  if (secret.length < 32) return null;
  return hmacB64(secret, `unsub:${leadId}`);
}

function siteOrigin(request: Request): string {
  return process.env.MEMBERS_SITE_ORIGIN || new URL(request.url).origin;
}

/**
 * Double opt-in: when EMAIL_SENDING is on, mint a verify token (hash stored) and email the
 * confirmation link. When off (default), do nothing: the lead stays `pending`.
 */
export async function maybeSendVerification(
  db: D1Database,
  request: Request,
  lead: { id: string; status: LeadRow["status"]; consent: boolean },
  email: string,
): Promise<"sent" | "off" | "skipped" | "failed"> {
  if (!lead.consent || lead.status !== "pending") return "skipped";
  if (!emailSendingEnabled()) return "off";
  const row = await db
    .prepare("SELECT verify_sent_at FROM leads WHERE id = ?")
    .bind(lead.id)
    .first<{ verify_sent_at: number | null }>();
  const now = nowSec();
  if (row?.verify_sent_at && now - row.verify_sent_at < RESEND_GAP_SEC) return "skipped";
  const unsub = await unsubscribeTokenFor(lead.id);
  if (!unsub) {
    console.log("[leads] EMAIL_SENDING on but EMAIL_TOKEN_SECRET missing/short; not sending");
    return "failed";
  }
  const verify = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await db
    .prepare(
      "UPDATE leads SET verify_token_hash = ?, verify_expires_at = ?, verify_sent_at = ?, unsubscribe_token_hash = ?, updated_at = ? WHERE id = ?",
    )
    .bind(await sha256Hex(verify), now + VERIFY_TTL_SEC, now, await sha256Hex(unsub), now, lead.id)
    .run();
  const origin = siteOrigin(request);
  const verifyUrl = `${origin}/api/verify?token=${verify}`;
  const unsubUrl = `${origin}/api/unsubscribe?token=${unsub}`;
  const res = await getEmailSender().send({
    to: email,
    subject: "Please confirm your Canary letter signup",
    text:
      `Hi,\n\nPlease confirm you want the free weekly Canary letter:\n${verifyUrl}\n\n` +
      `If you didn't sign up, ignore this email and you won't hear from us.\n\n` +
      `Unsubscribe any time: ${unsubUrl}\n\nCanary Dashboard · education only, not investment advice.`,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (!res.sent) console.log(`[leads] verification not sent: ${res.reason ?? "unknown"}`);
  return res.sent ? "sent" : "failed";
}

/* ---------- verify / unsubscribe ---------- */
export async function verifyByToken(token: string): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const db = await getMembersDb();
  const now = nowSec();
  const res = await db
    .prepare(
      "UPDATE leads SET status = 'verified', verified_at = ?, verify_token_hash = NULL, verify_expires_at = NULL, updated_at = ? " +
        "WHERE verify_token_hash = ? AND status = 'pending' AND verify_expires_at > ?",
    )
    .bind(now, now, await sha256Hex(token), now)
    .run();
  const ok = (res.meta?.changes ?? 0) > 0;
  console.log(`[leads] verify ${ok ? "ok" : "invalid"}`);
  return ok;
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const db = await getMembersDb();
  const now = nowSec();
  const res = await db
    .prepare(
      "UPDATE leads SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at, ?), verify_token_hash = NULL, updated_at = ? " +
        "WHERE unsubscribe_token_hash = ?",
    )
    .bind(now, now, await sha256Hex(token))
    .run();
  const ok = (res.meta?.changes ?? 0) > 0;
  console.log(`[leads] unsubscribe ${ok ? "ok" : "invalid"}`);
  return ok;
}

/* ---------- shared POST guard for the public form routes ---------- */
export async function guardFormPost(
  request: Request,
  route: string,
  limit: number,
  windowSec = 600,
): Promise<{ db: D1Database; ipH: string } | { error: string; status: number }> {
  if (!sameOrigin(request)) return { error: "Forbidden", status: 403 };
  let db: D1Database;
  try {
    db = await getMembersDb();
  } catch {
    console.log(`[leads] ${route}: MEMBERS_DB binding missing`);
    return { error: "Signups are temporarily unavailable. Please try again later.", status: 503 };
  }
  const ipH = await ipHash(clientIp(request));
  if (await rateLimited(db, route, ipH, limit, windowSec)) {
    console.log(`[leads] ${route}: rate limited ip=${ipH.slice(0, 8)}`);
    return { error: "Too many attempts. Please wait a few minutes and try again.", status: 429 };
  }
  return { db, ipH };
}

/** Honeypot: hidden field real people never fill. */
export function isBot(body: Record<string, unknown>): boolean {
  return String(body.hp_field ?? "").trim().length > 0;
}
