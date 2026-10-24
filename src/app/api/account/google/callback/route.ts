import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionSecret, siteOrigin } from "@/lib/members/config";
import { getMembersDb } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { createSessionCookie } from "@/lib/members/session";
import { sendWelcomeEmail } from "@/lib/members/verify";
import {
  GOOGLE_OAUTH_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleCallbackUrl,
  googleClientId,
  googleClientSecret,
  googleOAuthConfigured,
  openOAuthPending,
  upsertGoogleUser,
} from "@/lib/members/google";

export const dynamic = "force-dynamic";

function failRedirect(request: Request, reason: string) {
  const u = new URL("/account/login", siteOrigin(request));
  u.searchParams.set("google", reason);
  const res = NextResponse.redirect(u.toString(), 302);
  res.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

/**
 * Google OAuth PKCE callback.
 * Exchanges code, upserts user (email verified), sets session, clears OAuth cookie.
 */
export async function GET(request: Request) {
  const off = accountsOr404();
  if (off) return off;

  if (!googleOAuthConfigured()) {
    return failRedirect(request, "not_configured");
  }

  const url = new URL(request.url);
  const err = url.searchParams.get("error");
  if (err) return failRedirect(request, err === "access_denied" ? "denied" : "oauth_error");

  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (!code || !state) return failRedirect(request, "missing_code");

  let secret: string;
  try {
    secret = sessionSecret();
  } catch {
    return failRedirect(request, "session_secret");
  }

  const jar = await cookies();
  const pending = await openOAuthPending(jar.get(GOOGLE_OAUTH_COOKIE)?.value, secret);
  if (!pending || pending.state !== state) return failRedirect(request, "state_mismatch");

  try {
    const tokens = await exchangeGoogleCode({
      code,
      codeVerifier: pending.verifier,
      redirectUri: googleCallbackUrl(request),
      clientId: googleClientId(),
      clientSecret: googleClientSecret(),
    });
    const profile = await fetchGoogleProfile(tokens.access_token);
    const db = await getMembersDb();
    const { user, isNew } = await upsertGoogleUser(db, profile);

    if (isNew) {
      await sendWelcomeEmail(user.email, request);
    }

    const destPath = pending.next.startsWith("/") ? pending.next : "/account";
    const dest = new URL(destPath, siteOrigin(request));
    const res = NextResponse.redirect(dest.toString(), 302);
    res.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    await createSessionCookie(db, res, user.id, request.headers.get("user-agent"));
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error(`[members] google callback failed: ${msg}`);
    const reason =
      msg === "google_email_unverified"
        ? "email_unverified"
        : msg === "google_email_conflict" || msg === "google_sub_mismatch"
          ? "account_conflict"
          : "token_exchange";
    return failRedirect(request, reason);
  }
}
