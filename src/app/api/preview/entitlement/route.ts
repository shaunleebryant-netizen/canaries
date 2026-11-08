import { NextResponse } from "next/server";
import { resolveViewer } from "@/lib/members/previewAccess";
import { tierFor } from "@/lib/members/previewFulfillment";
import { readPreviewLedger } from "@/lib/members/previewStore";
import { PREVIEW_TIER_COOKIE, previewTierEnabled, signPreviewTier } from "@/lib/members/previewTier";

export const dynamic = "force-dynamic";

/** Refreshes the preview cookie only when the isolated ledger already says paid. */
export async function GET() {
  if (!previewTierEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await resolveViewer();
  if (!viewer.email) return NextResponse.json({ tier: viewer.tier, simulated: true });
  const ledger = await readPreviewLedger();
  const tier = viewer.tier === "paid" ? "paid" : tierFor(ledger, viewer.email);
  const res = NextResponse.json({ tier, simulated: true, email: viewer.email });
  if (tier === "paid" && viewer.tier !== "paid" && viewer.source === "preview") {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14;
    res.cookies.set(PREVIEW_TIER_COOKIE, await signPreviewTier({ tier: "paid", email: viewer.email, exp }), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return res;
}
