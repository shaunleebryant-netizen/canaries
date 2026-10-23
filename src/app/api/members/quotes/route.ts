import { NextResponse } from "next/server";
import { memberApiGuard } from "@/lib/members/guard";
import { loadMarketQuotes } from "@/lib/marketQuotes";

export const dynamic = "force-dynamic";

/** Live tickers + XL sector quotes (Yahoo). Auth via middleware. */
export async function GET(request: Request) {
  const denied = await memberApiGuard(); // null unless MEMBERS_AUTH_MODE=accounts
  if (denied) return denied;
  const url = new URL(request.url);
  const bypass = url.searchParams.get("refresh") === "1";
  const payload = await loadMarketQuotes({ bypassCache: bypass });
  return NextResponse.json(payload);
}
