import { NextResponse } from "next/server";
import { loadCanarySparklines } from "@/lib/loadCanarySparklines";

export const dynamic = "force-dynamic";

/** Last ~10 session canary sparklines. Auth via middleware. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const live = url.searchParams.get("live") !== "0";
  const payload = await loadCanarySparklines({ live });
  return NextResponse.json(payload);
}
