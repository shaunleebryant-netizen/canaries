import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/members/crypto";
import { getMembersDb, getUserByEmail, logMemberEvent } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { jsonError, readBody, safeNext } from "@/lib/members/http";
import { createSessionCookie } from "@/lib/members/session";
import { isEmailVerified } from "@/lib/members/verify";

export const dynamic = "force-dynamic";

// Dummy hash so unknown emails cost the same PBKDF2 time (no user enumeration by timing).
const DUMMY = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const b = await readBody(request);
  const db = await getMembersDb();
  const user = await getUserByEmail(db, b.email || "");
  const stored = user?.password_hash || DUMMY;
  const ok = await verifyPassword(b.password || "", stored);
  if (!user || !user.password_hash || !ok) return jsonError("Email or password is incorrect.", 401);
  if (!isEmailVerified(user)) {
    return jsonError("Please confirm your email first: click the link we emailed you. Lost it? Use the Resend link below.", 403);
  }
  await logMemberEvent(db, user.id, "login");
  const res = NextResponse.json({ ok: true, next: safeNext(b.next) });
  await createSessionCookie(db, res, user.id, request.headers.get("user-agent"));
  return res;
}
