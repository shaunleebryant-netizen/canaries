import { NextResponse } from "next/server";
import { passwordChangedEmailMessage, sendAuthEmail } from "@/lib/members/authEmail";
import { siteOrigin } from "@/lib/members/config";
import { hashPassword, sha256Hex } from "@/lib/members/crypto";
import { getMembersDb, getUserById, logMemberEvent, nowSec } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { jsonError, readBody } from "@/lib/members/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const b = await readBody(request);
  const password = b.password || "";
  if (password.length < 10 || password.length > 200) return jsonError("Password must be at least 10 characters.");
  const db = await getMembersDb();
  const hash = await sha256Hex(b.token || "");
  const now = nowSec();
  const row = await db
    .prepare("SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?")
    .bind(hash, now)
    .first<{ user_id: string }>();
  if (!row) return jsonError("Reset link is invalid or expired.", 400);
  await db.batch([
    db.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").bind(now, hash),
    db
      .prepare("UPDATE users SET password_hash = ?, auth_provider = CASE WHEN google_sub IS NOT NULL THEN 'both' ELSE 'password' END, updated_at = ? WHERE id = ?")
      .bind(await hashPassword(password), now, row.user_id),
    // Sign out everywhere after a reset.
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, row.user_id),
  ]);
  await logMemberEvent(db, row.user_id, "reset_completed");

  const user = await getUserById(db, row.user_id);
  if (user) {
    const loginUrl = `${siteOrigin(request)}/account/login`;
    await sendAuthEmail(passwordChangedEmailMessage(user.email, loginUrl));
  }

  return NextResponse.json({ ok: true, next: "/account/login?reset=1" });
}
