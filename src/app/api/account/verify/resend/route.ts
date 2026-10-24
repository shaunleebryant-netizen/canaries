import { NextResponse } from "next/server";
import { getMembersDb, getUserByEmail } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { EMAIL_RE, jsonError, readBody } from "@/lib/members/http";
import { getCurrentUser } from "@/lib/members/session";
import { isEmailVerified, issueVerifyEmail } from "@/lib/members/verify";

export const dynamic = "force-dynamic";

/**
 * Resend verify email. Auth'd user preferred; otherwise email in body (generic response).
 * Never reveals whether the email exists outside test mode.
 */
export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const b = await readBody(request);
  const db = await getMembersDb();
  const cur = await getCurrentUser();
  let user = cur?.user ?? null;
  if (!user) {
    const email = (b.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return jsonError("Enter a valid email.");
    user = await getUserByEmail(db, email);
  }
  const generic = { ok: true, message: "If that account needs verification, a new link has been issued." };
  if (!user) return NextResponse.json(generic);
  if (isEmailVerified(user)) {
    return NextResponse.json({ ok: true, message: "Email is already verified. You can log in." });
  }
  const issued = await issueVerifyEmail(db, user, request);
  return NextResponse.json({
    ...generic,
    ...(issued.testModeLink ? { testModeVerifyLink: issued.testModeLink } : {}),
  });
}
