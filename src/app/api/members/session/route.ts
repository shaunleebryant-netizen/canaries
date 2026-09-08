import { NextResponse } from "next/server";
import { MEMBERS_COOKIE, expectedMembersPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = await request.json();
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (password !== expectedMembersPassword()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(MEMBERS_COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Stub: no secure flag forced for local http
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MEMBERS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
