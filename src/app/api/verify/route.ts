import { NextResponse } from "next/server";
import { verifyByToken } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Double opt-in confirmation.
 * GET  /api/verify?token=...  -> 303 to /letter (a page with a "Confirm" button). GET never
 *      changes anything, so email link scanners that pre-fetch URLs can't confirm on a
 *      person's behalf.
 * POST /api/verify (form field or ?token=) -> marks the lead verified, 303 to the result page.
 */
function redirect(request: Request, qs: string) {
  return NextResponse.redirect(new URL(`/letter?${qs}`, request.url), 303);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return redirect(request, "result=invalid");
  return redirect(request, `action=verify&token=${encodeURIComponent(token)}`);
}

export async function POST(request: Request) {
  let token = new URL(request.url).searchParams.get("token") || "";
  if (!token) {
    try {
      token = String((await request.formData()).get("token") || "");
    } catch {
      token = "";
    }
  }
  let ok = false;
  try {
    ok = await verifyByToken(token);
  } catch {
    ok = false;
  }
  return redirect(request, ok ? "result=verified" : "result=invalid");
}
