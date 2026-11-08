import { NextResponse } from "next/server";
import { verifiedSessionGuard } from "@/lib/members/guard";
import { loadMarketQuotes } from "@/lib/marketQuotes";

export const dynamic = "force-dynamic";

/** Live tickers + XL sector quotes (Yahoo). Auth via middleware. */
export async function GET(request: Request) {
  const denied = await verifiedSessionGuard();
  if (denied) return denied;
  const url = new URL(request.url);
  const bypass = url.searchParams.get("refresh") === "1";
  const payload = await loadMarketQuotes({ bypassCache: bypass });
  return NextResponse.json(payload);
}
