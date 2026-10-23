import { NextResponse } from "next/server";
import { sessionSecret } from "@/lib/members/config";
import { accountsOr404 } from "@/lib/members/guard";
import { safeNext } from "@/lib/members/http";
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_TTL_SECONDS,
  googleAuthorizeUrl,
  googleCallbackUrl,
  googleClientId,
  googleClientSecret,
  googleOAuthConfigured,
  newOAuthState,
  newPkceVerifier,
  pkceChallenge,
  sealOAuthPending,
} from "@/lib/members/google";
import { nowSec } from "@/lib/members/db";

export const dynamic = "force-dynamic";

/**
 * Google OAuth PKCE start.
 * Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (shell / Worker secrets — never .env.local).
 * Redirect URI must be registered: {MEMBERS_SITE_ORIGIN}/api/account/google/callback
 * See /workspace/exports/members-auth/google-oauth-setup.md
 */
export async function GET(request: Request) {
  const off = accountsOr404();
  if (off) return off;

  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Google OAuth is not configured yet. Owner must create an OAuth client.",
        needs: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "authorized redirect URI"],
        setup: "/workspace/exports/members-auth/google-oauth-setup.md",
      },
      { status: 501 },
    );
  }

  let secret: string;
  try {
    secret = sessionSecret();
  } catch {
    return NextResponse.json(
      { ok: false, error: "SESSION_SECRET required for Google OAuth (accounts mode)." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next") || undefined, "/account");
  const verifier = newPkceVerifier();
  const state = newOAuthState();
  const challenge = await pkceChallenge(verifier);
  const redirectUri = googleCallbackUrl(request);

  const sealed = await sealOAuthPending(
    { verifier, state, next, exp: nowSec() + GOOGLE_OAUTH_TTL_SECONDS },
    secret,
  );

  const authorize = googleAuthorizeUrl({
    clientId: googleClientId(),
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  // Ensure secret is present (configured check already requires it; silence unused if tree-shaken).
  void googleClientSecret();

  const res = NextResponse.redirect(authorize, 302);
  res.cookies.set(GOOGLE_OAUTH_COOKIE, sealed, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: GOOGLE_OAUTH_TTL_SECONDS,
  });
  return res;
}
