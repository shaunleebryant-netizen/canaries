import { NextResponse } from "next/server";
import { hashPassword, randomToken } from "@/lib/members/crypto";
import { getMembersDb, getUserByEmail, logMemberEvent, nowSec } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { EMAIL_RE, jsonError, readBody } from "@/lib/members/http";
import { createSessionCookie } from "@/lib/members/session";
import { adminEmails } from "@/lib/members/config";
import { issueVerifyEmail, shouldAutoVerifyEmail } from "@/lib/members/verify";

export const dynamic = "force-dynamic";

const TLD_TYPOS: Record<string, string> = { con: "com", cmo: "com", ocm: "com", comm: "com", coom: "com", vom: "com", xom: "com" };
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
  "outlok.com": "outlook.com", "iclod.com": "icloud.com",
};
/** Catch obvious email typos before the verify mail goes nowhere (e.g. name@domain.con). */
function emailTypoHint(email: string): string | null {
  const [local, domain = ""] = email.split("@");
  const fixedDomain = DOMAIN_TYPOS[domain];
  if (fixedDomain) return `${local}@${fixedDomain}`;
  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  if (TLD_TYPOS[tld]) return `${local}@${[...parts.slice(0, -1), TLD_TYPOS[tld]].join(".")}`;
  return null;
}

export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const b = await readBody(request);
  const email = (b.email || "").trim().toLowerCase();
  const password = b.password || "";
  if (!EMAIL_RE.test(email) || email.length > 254) return jsonError("Enter a valid email.");
  const hint = emailTypoHint(email);
  if (hint) return jsonError(`That email looks like it has a typo. Did you mean ${hint}?`);
  if (password.length < 10 || password.length > 200) return jsonError("Password must be at least 10 characters.");

  const db = await getMembersDb();
  if (await getUserByEmail(db, email)) return jsonError("An account with that email already exists. Log in instead.", 409);

  const id = `usr_${randomToken(12)}`;
  const now = nowSec();
  const autoVerify = shouldAutoVerifyEmail(email);
  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, is_admin, email_verified_at, auth_provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      email,
      await hashPassword(password),
      adminEmails().includes(email) ? 1 : 0,
      autoVerify ? now : null,
      "password",
      now,
      now,
    )
    .run();
  await logMemberEvent(db, id, "signup", autoVerify ? "auto_verified_admin" : "pending_verify");

  const user = (await getUserByEmail(db, email))!;
  let testModeVerifyLink: string | undefined;
  if (!autoVerify) {
    const issued = await issueVerifyEmail(db, user, request);
    testModeVerifyLink = issued.testModeLink;
  }

  // Soft session: /account OK; /members blocked until email_verified_at (see guard).
  const res = NextResponse.json({
    ok: true,
    next: autoVerify ? "/account" : "/account/verify?pending=1",
    ...(testModeVerifyLink ? { testModeVerifyLink } : {}),
  });
  await createSessionCookie(db, res, id, request.headers.get("user-agent"));
  return res;
}
