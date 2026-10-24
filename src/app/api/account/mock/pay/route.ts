import { NextResponse } from "next/server";
import { stripeMockEnabled } from "@/lib/members/config";
import { randomToken } from "@/lib/members/crypto";
import { readBody, jsonError } from "@/lib/members/http";
import { TEST_CARDS, sendSignedEvent } from "@/lib/members/mock";
import { PLANS, isPlanId } from "@/lib/members/plans";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";

/** MOCK checkout "Pay" (local only). 404 unless STRIPE_MOCK=1 in non-production accounts mode. */
export async function POST(request: Request) {
  if (!stripeMockEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cur = await getCurrentUser();
  if (!cur) return jsonError("Not logged in", 401);
  const b = await readBody(request);
  if (!isPlanId(b.plan)) return jsonError("Unknown plan");
  const card = TEST_CARDS[(b.card || "").replace(/\D/g, "")];
  if (!card) return jsonError("Use a Stripe test card, e.g. 4242 4242 4242 4242.");
  if (!card.ok) return jsonError(card.message, 402);

  const plan = PLANS[b.plan];
  const origin = new URL(request.url).origin;
  const customer = cur.user.stripe_customer_id || `cus_mock_${randomToken(8)}`;
  const subId = `sub_mock_${randomToken(8)}`;
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + (plan.interval === "year" ? 365 : 30) * 86400;
  const meta = { user_id: cur.user.id, plan: plan.id };

  const results = [];
  results.push(
    await sendSignedEvent(origin, "checkout.session.completed", {
      id: `cs_test_mock_${randomToken(8)}`,
      object: "checkout.session",
      mode: "subscription",
      client_reference_id: cur.user.id,
      customer,
      subscription: subId,
      amount_total: plan.amount,
      currency: "usd",
      payment_status: "paid",
      metadata: meta,
    }),
  );
  results.push(
    await sendSignedEvent(origin, "customer.subscription.created", {
      id: subId,
      object: "subscription",
      customer,
      status: "active",
      cancel_at_period_end: false,
      current_period_start: now,
      current_period_end: periodEnd,
      metadata: meta,
      items: { data: [{ price: { id: `price_mock_${plan.id}` } }] },
    }),
  );
  return NextResponse.json({ ok: true, next: "/account?checkout=success", results });
}
