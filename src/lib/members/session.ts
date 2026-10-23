import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, accountsEnabled, sessionSecret } from "./config";
import { randomToken } from "./crypto";
import { type D1Database, type UserRow, getMembersDb, getUserById, nowSec } from "./db";
import { signSession, verifySessionToken } from "./sessionToken";

export async function createSessionCookie(
  db: D1Database,
  res: NextResponse,
  userId: string,
  userAgent: string | null,
): Promise<void> {
  const sid = randomToken(24);
  const now = nowSec();
  const exp = now + SESSION_TTL_SECONDS;
  await db
    .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)")
    .bind(sid, userId, now, exp, userAgent?.slice(0, 200) ?? null)
    .run();
  const token = await signSession({ sid, uid: userId, exp }, sessionSecret());
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true, // browsers treat http://localhost as secure, so local dev still works
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Current user from signed cookie + non-revoked session row. Null when stub mode. */
export async function getCurrentUser(): Promise<{ user: UserRow; sid: string } | null> {
  if (!accountsEnabled()) return null;
  const jar = await cookies();
  const p = await verifySessionToken(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!p) return null;
  const db = await getMembersDb();
  const s = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND revoked_at IS NULL AND expires_at > ?")
    .bind(p.sid, nowSec())
    .first<{ user_id: string }>();
  if (!s || s.user_id !== p.uid) return null;
  const user = await getUserById(db, p.uid);
  return user ? { user, sid: p.sid } : null;
}
