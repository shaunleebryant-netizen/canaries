/**
 * Email verification tokens (accounts mode). EMAIL_SENDING stays off by default —
 * callers may invoke getEmailSender() via authEmail; DisabledSender no-ops until the owner flips it.
 */
import { VERIFY_TTL_SECONDS, adminEmails, membersTestMode, siteOrigin } from "./config";
import { sendAuthEmail, verifyEmailMessage, welcomeEmailMessage } from "./authEmail";
import { randomToken, sha256Hex } from "./crypto";
import { type D1Database, type UserRow, getUserById, logMemberEvent, nowSec } from "./db";
import { emailSendingEnabled } from "@/lib/email/sender";

export function isEmailVerified(user: UserRow | null | undefined): boolean {
  return user != null && user.email_verified_at != null && user.email_verified_at > 0;
}

/** Mint a single-use verify token; returns raw token + link. Does not send email. */
export async function createEmailVerification(
  db: D1Database,
  userId: string,
  request: Request,
): Promise<{ token: string; link: string; expiresAt: number }> {
  const token = randomToken(32);
  const now = nowSec();
  const expiresAt = now + VERIFY_TTL_SECONDS;
  await db
    .prepare(
      "INSERT INTO email_verifications (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(await sha256Hex(token), userId, now, expiresAt)
    .run();
  const link = `${siteOrigin(request)}/account/verify?token=${encodeURIComponent(token)}`;
  return { token, link, expiresAt };
}

/**
 * Send verify email via auth templates (no-op when EMAIL_SENDING off).
 * In members test mode (or when sending is off in non-production), returns the link for on-page display.
 */
export async function issueVerifyEmail(
  db: D1Database,
  user: UserRow,
  request: Request,
): Promise<{ link: string; sent: boolean; testModeLink?: string }> {
  const { link } = await createEmailVerification(db, user.id, request);
  await logMemberEvent(db, user.id, "verify_requested", emailSendingEnabled() ? "email attempted" : "email stubbed");

  const result = await sendAuthEmail(verifyEmailMessage(user.email, link));

  const exposeLink =
    membersTestMode() || (!emailSendingEnabled() && process.env.NODE_ENV !== "production");
  if (exposeLink) {
    console.log(
      `[members][TEST MODE] verify link for ${user.email}: ${link} (EMAIL_SENDING=${emailSendingEnabled() ? "on" : "off"})`,
    );
    return { link, sent: result.sent, testModeLink: link };
  }
  return { link, sent: result.sent };
}

/** Consume token; set email_verified_at; fire welcome (still gated by EMAIL_SENDING). */
export async function consumeEmailVerification(
  db: D1Database,
  rawToken: string,
  request?: Request,
): Promise<{ ok: true; userId: string; already?: boolean } | { ok: false; reason: string }> {
  if (!rawToken) return { ok: false, reason: "missing" };
  const hash = await sha256Hex(rawToken);
  const now = nowSec();
  const row = await db
    .prepare(
      "SELECT user_id FROM email_verifications WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
    )
    .bind(hash, now)
    .first<{ user_id: string }>();
  if (!row) return { ok: false, reason: "invalid_or_expired" };

  const user = await db.prepare("SELECT email_verified_at FROM users WHERE id = ?").bind(row.user_id).first<{
    email_verified_at: number | null;
  }>();
  if (user?.email_verified_at) {
    await db.prepare("UPDATE email_verifications SET used_at = ? WHERE token_hash = ?").bind(now, hash).run();
    return { ok: true, userId: row.user_id, already: true };
  }

  await db.batch([
    db.prepare("UPDATE email_verifications SET used_at = ? WHERE token_hash = ?").bind(now, hash),
    db.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?").bind(now, now, row.user_id),
  ]);
  await logMemberEvent(db, row.user_id, "verify_completed");

  const full = await getUserById(db, row.user_id);
  if (full) await sendWelcomeEmail(full.email, request);

  return { ok: true, userId: row.user_id };
}

export async function sendWelcomeEmail(email: string, request?: Request): Promise<void> {
  const origin =
    (request ? siteOrigin(request) : null) ||
    process.env.MEMBERS_SITE_ORIGIN ||
    "https://canarydashboard.com";
  await sendAuthEmail(welcomeEmailMessage(email, `${origin}/account`, `${origin}/members`));
}

/** Admins listed in ADMIN_EMAILS are treated as verified at signup (ops convenience). */
export function shouldAutoVerifyEmail(email: string): boolean {
  // 2026-10-15: admins now bypass the subscription gate, so an admin email must PROVE it owns the
  // inbox (verify link) before it counts. Auto-verify only outside production (local testing).
  if (process.env.NODE_ENV === "production") return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
