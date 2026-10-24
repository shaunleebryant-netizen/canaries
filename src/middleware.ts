import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, accountsEnabled, sessionSecret } from "@/lib/members/config";
import { verifySessionToken } from "@/lib/members/sessionToken";
import { ACCESS_JWT_HEADER, isOwnerPath, verifyAccessJwt } from "@/lib/owner/accessJwt";

const MEMBERS_COOKIE = "canary_members";

/**
 * MEMBERS_AUTH_MODE=accounts (off by default): per-user signed session cookie.
 * The subscription check happens in the /members page and /api/members routes (D1).
 */
async function accountsMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/members/login") {
    const login = new URL("/account/login", request.url);
    login.searchParams.set("next", request.nextUrl.searchParams.get("next") || "/members");
    return NextResponse.redirect(login);
  }
  if (pathname === "/api/members/session") {
    // Shared-password stub login is disabled in accounts mode.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let ok = false;
  try {
    ok = Boolean(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret()));
  } catch {
    ok = false; // missing SESSION_SECRET -> fail closed
  }
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/account/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

const NO_INDEX = "noindex, nofollow, noarchive";

/**
 * Owner-only area (/owner/*, /api/owner/*): Cloudflare Access sits in front; here we verify the
 * Cf-Access-Jwt-Assertion (team certs, AUD, issuer, expiry, owner email). Anything else → bare 404,
 * so the area is indistinguishable from a missing page. See src/lib/owner/config.ts.
 */
async function ownerMiddleware(request: NextRequest) {
  const verdict = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER));
  if (!verdict.ok) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": NO_INDEX, "cache-control": "no-store" },
    });
  }
  const res = NextResponse.next();
  res.headers.set("x-robots-tag", NO_INDEX);
  res.headers.set("cache-control", "private, no-store");
  return res;
}

export async function middleware(request: NextRequest) {
  if (isOwnerPath(request.nextUrl.pathname)) return ownerMiddleware(request);
  if (accountsEnabled()) return accountsMiddleware(request);

  // ---- LOCAL DEV ONLY stub (never reached in production: accountsEnabled() is always true there) ----
  const { pathname } = request.nextUrl;

  if (
    pathname === "/members/login" ||
    pathname === "/api/members/session"
  ) {
    return NextResponse.next();
  }

  const needsAuth =
    pathname.startsWith("/members") || pathname.startsWith("/api/members");

  if (!needsAuth) return NextResponse.next();

  const password = process.env.MEMBERS_PASSWORD || "canary-dev"; // dev-only, see above
  const token = request.cookies.get(MEMBERS_COOKIE)?.value;

  if (token === password) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/members/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/members", "/members/:path*", "/api/members/:path*", "/owner", "/owner/:path*", "/api/owner", "/api/owner/:path*"],
};
