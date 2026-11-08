import { NextResponse } from "next/server";
import { randomToken } from "@/lib/members/crypto";
import { readBody } from "@/lib/members/http";
import { resolveViewer } from "@/lib/members/previewAccess";
import { applyFulfillmentEvent, type PreviewOutcome } from "@/lib/members/previewFulfillment";
import { readPreviewLedger, writePreviewLedger } from "@/lib/members/previewStore";
import { PREVIEW_TIER_COOKIE, previewTierEnabled, signPreviewTier } from "@/lib/members/previewTier";

export const dynamic = "force-dynamic";

const OUTCOMES = new Set<PreviewOutcome>(["pending", "paid", "failed", "cancelled"]);

/**
 * Preview-only stand-in for a verified webhook. The browser chooses an outcome,
 * but this route applies it on the isolated ledger. It never calls Stripe.
 */
export async function POST(request: Request) {
  if (!previewTierEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await resolveViewer();
  if (!viewer.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readBody(request);
  const outcome = OUTCOMES.has(body.outcome as PreviewOutcome) ? (body.outcome as PreviewOutcome) : null;
  if (!outcome || !body.checkoutId) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ledger = await readPreviewLedger();
  const checkout = ledger.checkouts.find((c) => c.id === body.checkoutId && c.email === viewer.email);
  if (!checkout) return NextResponse.json({ error: "Unknown checkout" }, { status: 404 });
  const applied = applyFulfillmentEvent(
    ledger,
    { id: `evt_${randomToken(9)}`, checkoutId: checkout.id, outcome },
    true,
  );
  await writePreviewLedger(applied.ledger);
  const res = NextResponse.json({
    ok: applied.result.ok,
    simulated: true,
    tier: applied.result.tier,
    backupStatus: applied.result.backupStatus,
    duplicate: applied.result.duplicate,
  });
  if (applied.result.tier === "paid") {
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
