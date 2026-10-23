import { NextResponse } from "next/server";
import { getMembersDb, logMemberEvent, nowSec } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { clearSessionCookie, getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const cur = await getCurrentUser();
  if (cur) {
    const db = await getMembersDb();
    await db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").bind(nowSec(), cur.sid).run();
    await logMemberEvent(db, cur.user.id, "logout");
  }
  const res = NextResponse.redirect(new URL("/account/login?out=1", request.url), 303);
  clearSessionCookie(res);
  return res;
}
