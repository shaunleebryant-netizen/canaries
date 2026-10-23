import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Unsubscribe.
 * GET  /api/unsubscribe?token=...  -> 303 to /letter (page with an "Unsubscribe" button); GET
 *      itself changes nothing (link scanners).
 * POST /api/unsubscribe?token=...  -> unsubscribes. Supports RFC 8058 one-click
 *      (body "List-Unsubscribe=One-Click" -> plain 200) and the /letter button (-> 303 page).
 */
function redirect(request: Request, qs: string) {
  return NextResponse.redirect(new URL(`/letter?${qs}`, request.url), 303);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return redirect(request, "result=invalid");
  return redirect(request, `action=unsubscribe&token=${encodeURIComponent(token)}`);
}

export async function POST(request: Request) {
  let token = new URL(request.url).searchParams.get("token") || "";
  let oneClick = false;
  try {
    const fd = await request.formData();
    if (!token) token = String(fd.get("token") || "");
    oneClick = fd.get("List-Unsubscribe") === "One-Click";
  } catch {
    /* no body */
  }
  let ok = false;
  try {
    ok = await unsubscribeByToken(token);
  } catch {
    ok = false;
  }
  if (oneClick) {
    return new NextResponse(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
  }
  return redirect(request, ok ? "result=unsubscribed" : "result=invalid");
}
