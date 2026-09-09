import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MEMBERS_COOKIE = "canary_members";

export function middleware(request: NextRequest) {
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

  const password = process.env.MEMBERS_PASSWORD || "canary-dev";
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
  matcher: ["/members", "/members/:path*", "/api/members/:path*"],
};
