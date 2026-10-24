import { NextResponse } from "next/server";
import { passwordResetEmailMessage, sendAuthEmail } from "@/lib/members/authEmail";
import { RESET_TTL_SECONDS, membersTestMode, siteOrigin } from "@/lib/members/config";
import { randomToken, sha256Hex } from "@/lib/members/crypto";
import { getMembersDb, getUserByEmail, logMemberEvent, nowSec } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { readBody } from "@/lib/members/http";
import { emailSendingEnabled } from "@/lib/email/sender";

export const dynamic = "force-dynamic";

/**
 * Password reset request. Sends via getEmailSender() when EMAIL_SENDING=1
 * (From shaun@canarydashboard.com). Default off → no email; test mode returns link on-page.
 * Google-only accounts (null password_hash): no reset link issued.
 */
export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const b = await readBody(request);
  const db = await getMembersDb();
  const user = await getUserByEmail(db, b.email || "");
  const generic = { ok: true, message: "If that email has an account, a reset link has been issued." };
  if (!user) return NextResponse.json(generic);
  // Google-only: no local password to reset.
  if (!user.password_hash) return NextResponse.json(generic);

  const token = randomToken(32);
  const now = nowSec();
  await db
    .prepare("INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), user.id, now, now + RESET_TTL_SECONDS)
    .run();
  const link = `${siteOrigin(request)}/account/reset?token=${encodeURIComponent(token)}`;

  const sendResult = await sendAuthEmail(passwordResetEmailMessage(user.email, link));
  await logMemberEvent(
    db,
    user.id,
    "reset_requested",
    sendResult.sent ? "email sent" : emailSendingEnabled() ? `email failed: ${sendResult.reason || "unknown"}` : "email stubbed",
  );

  const exposeLink =
    membersTestMode() || (!emailSendingEnabled() && process.env.NODE_ENV !== "production");
  if (exposeLink) {
    console.log(
      `[members][TEST MODE] password reset link for ${user.email}: ${link} (EMAIL_SENDING=${emailSendingEnabled() ? "on" : "off"})`,
    );
    return NextResponse.json({ ...generic, testModeResetLink: link });
  }
  return NextResponse.json(generic);
}
