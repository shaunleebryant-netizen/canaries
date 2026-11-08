import { NextResponse } from "next/server";
import { randomToken } from "@/lib/members/crypto";
import { readBody } from "@/lib/members/http";
import { PLANS } from "@/lib/members/plans";
import { resolveViewer } from "@/lib/members/previewAccess";
import { safeReturnTab, startPreviewCheckout, type PreviewCheckout } from "@/lib/members/previewFulfillment";
import { readPreviewLedger, writePreviewLedger } from "@/lib/members/previewStore";
import { previewRedirect } from "@/lib/members/previewRedirect";
import { previewTierEnabled } from "@/lib/members/previewTier";

export const dynamic = "force-dynamic";

/** Starts a simulated membership checkout. Does not call Stripe. */
export async function POST(request: Request) {
  if (!previewTierEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await resolveViewer();
  if (!viewer.email || viewer.tier === "paid") {
    return previewRedirect(request, viewer.tier === "paid" ? "/members" : "/signup/free");
  }
  const body = await readBody(request);
  const plan: PreviewCheckout["plan"] = body.plan === "launch_monthly" ? "launch_monthly" : "launch_annual";
  const chosen = PLANS[plan];
  const ledger = await readPreviewLedger();
  const id = `chk_${randomToken(9)}`;
  await writePreviewLedger(
    startPreviewCheckout(ledger, {
      id,
      email: viewer.email,
      plan,
      amount: chosen.amount,
      priceEnv: chosen.priceEnv,
      returnTab: safeReturnTab(body.tab),
      now: new Date().toISOString(),
    }),
  );
  return previewRedirect(request, `/preview/checkout/status?id=${id}`);
}
