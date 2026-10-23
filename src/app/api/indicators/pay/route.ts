import { NextResponse } from "next/server";
import { getMembersDb, nowSec } from "@/lib/members/db";
import { siteOrigin } from "@/lib/members/config";
import { readBody } from "@/lib/members/http";
import { getStripe } from "@/lib/members/stripe";
import { indicatorCheckoutEnabled, indicatorPriceId } from "@/lib/members/indicatorDelivery";

export const dynamic = "force-dynamic";

/**
 * Indicator one-off payment (US$99). Form POST {order} -> 303 to Stripe Checkout (mode=payment).
 * 404 unless INDICATOR_CHECKOUT=1. Live keys still need MEMBERS_ALLOW_LIVE_STRIPE=1 (getStripe()).
 */
export async function POST(request: Request) {
  if (!indicatorCheckoutEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const to = (p: string) => NextResponse.redirect(new URL(p, request.url), 303);
  const b = await readBody(request);
  const orderId = String(b.order ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return to("/indicators");
  const db = await getMembersDb();
  const order = await db
    .prepare("SELECT id, script_id, script_name, email, status FROM indicator_orders WHERE id = ?")
    .bind(orderId)
    .first<{ id: string; script_id: string; script_name: string; email: string; status: string }>();
  if (!order) return to("/indicators");
  if (order.status !== "pending_payment") return to(`/indicators/checkout?order=${orderId}`);
  const stripe = getStripe();
  const price = indicatorPriceId();
  if (!stripe || !price) return to(`/indicators/checkout?order=${orderId}&error=unavailable`);
  const origin = siteOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.email,
    client_reference_id: orderId,
    line_items: [{ price, quantity: 1 }],
    metadata: { kind: "indicator", order_id: orderId, script_id: order.script_id },
    payment_intent_data: { metadata: { kind: "indicator", order_id: orderId } },
    success_url: `${origin}/indicators/checkout?order=${orderId}&paid=1`,
    cancel_url: `${origin}/indicators/checkout?order=${orderId}`,
  });
  await db.prepare("UPDATE indicator_orders SET stripe_session_id = ?, updated_at = ? WHERE id = ?").bind(session.id, nowSec(), orderId).run();
  return NextResponse.redirect(session.url!, 303);
}
