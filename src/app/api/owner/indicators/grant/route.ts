import { NextResponse } from "next/server";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "@/lib/owner/accessJwt";
import { getMembersDb, nowSec } from "@/lib/members/db";
import { markGranted } from "@/lib/owner/indicatorBuyers";

export const dynamic = "force-dynamic";

/** Owner only: mark a paid indicator order as granted (TradingView access added). Form POST -> 303 back. */
export async function POST(request: Request) {
  const v = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER));
  if (!v.ok) return new NextResponse("Not found", { status: 404 });
  const form = await request.formData();
  const orderId = String(form.get("order") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.redirect(new URL("/owner/indicators", request.url), 303);
  const ok = await markGranted(await getMembersDb(), orderId, nowSec());
  return NextResponse.redirect(new URL(`/owner/indicators?${ok ? "granted" : "nochange"}=${orderId.slice(0, 8)}`, request.url), 303);
}
