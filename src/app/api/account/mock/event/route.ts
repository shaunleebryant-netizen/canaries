import { NextResponse } from "next/server";
import { stripeMockEnabled } from "@/lib/members/config";
import { getLatestSubscription, getMembersDb } from "@/lib/members/db";
import { randomToken } from "@/lib/members/crypto";
import { jsonError, readBody } from "@/lib/members/http";
import { sendSignedEvent } from "@/lib/members/mock";
import { type PlanId, PLANS } from "@/lib/members/plans";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";

/**
 * MOCK portal / lifecycle simulator (local only). Emits the same signed events Stripe would:
 *  cancel_auto_renew  -> customer.subscription.updated (cancel_at_period_end=true)
 *  resume_auto_renew  -> customer.subscription.updated (cancel_at_period_end=false)
 *  period_end         -> customer.subscription.deleted (what Stripe sends when a non-renewing sub reaches period end)
 *  renewal_failed     -> invoice.payment_failed + customer.subscription.updated (status=past_due)
 *  clock_past_grace (test only) -> moves past_due_since back 8 days in LOCAL D1 (simulated clock)
 *  clock_past_period_end (test only) -> subscription.updated with current_period_end in the past,
 *                        proving access stops at period end even if the deleted event is late
 */
export async function POST(request: Request) {
  if (!stripeMockEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cur = await getCurrentUser();
  if (!cur) return jsonError("Not logged in", 401);
  const b = await readBody(request);
  const sub = await getLatestSubscription(await getMembersDb(), cur.user.id);
  if (!sub) return jsonError("No subscription");
  const origin = new URL(request.url).origin;
  const now = Math.floor(Date.now() / 1000);
  const base = {
    id: sub.id,
    object: "subscription",
    customer: sub.stripe_customer_id,
    status: sub.status,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    current_period_end: sub.current_period_end,
    metadata: { user_id: sub.user_id, plan: sub.plan },
    items: { data: [{ price: { id: sub.price_id } }] },
  };
  const results = [];
  switch (b.action) {
    case "cancel_auto_renew":
      results.push(await sendSignedEvent(origin, "customer.subscription.updated", { ...base, cancel_at_period_end: true, canceled_at: now }));
      break;
    case "resume_auto_renew":
      results.push(await sendSignedEvent(origin, "customer.subscription.updated", { ...base, cancel_at_period_end: false, canceled_at: null }));
      break;
    case "period_end":
      results.push(await sendSignedEvent(origin, "customer.subscription.deleted", { ...base, status: "canceled", ended_at: now }));
      break;
    case "renewal_failed":
      results.push(
        await sendSignedEvent(origin, "invoice.payment_failed", {
          id: `in_mock_${randomToken(8)}`,
          object: "invoice",
          customer: sub.stripe_customer_id,
          subscription: sub.id,
          amount_due: PLANS[sub.plan as PlanId]?.amount ?? 0,
          currency: "usd",
          attempt_count: 1,
        }),
      );
      results.push(await sendSignedEvent(origin, "customer.subscription.updated", { ...base, status: "past_due" }));
      break;
    case "clock_past_grace": {
      await (await getMembersDb())
        .prepare("UPDATE subscriptions SET past_due_since = ? WHERE id = ? AND status = 'past_due'")
        .bind(now - 8 * 86400, sub.id)
        .run();
      results.push({ type: "local-clock: past_due_since -8d", status: 200, body: null });
      break;
    }
    case "clock_past_period_end":
      results.push(await sendSignedEvent(origin, "customer.subscription.updated", { ...base, current_period_end: now - 60 }));
      break;
    default:
      return jsonError("Unknown action");
  }
  return NextResponse.json({ ok: true, results });
}
