import { NextResponse } from "next/server";
import { liveStripeAllowed } from "@/lib/members/config";
import { getMembersDb } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { cryptoProvider, getStripe, stripeForSignatures, webhookSecret } from "@/lib/members/stripe";
import { processStripeEvent } from "@/lib/members/webhook";
import { indicatorCheckoutEnabled } from "@/lib/members/indicatorDelivery";

export const dynamic = "force-dynamic";

/** Stripe webhook: verifies signature, then updates member access in D1. 404 in stub mode. */
export async function POST(request: Request) {
  // Open when accounts mode OR indicator checkout is on (owner 2026-10-14); 404 otherwise.
  const off = indicatorCheckoutEnabled() ? null : accountsOr404();
  if (off) return off;

  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: "webhook secret not configured" }, { status: 500 });
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const raw = await request.text();

  let event;
  try {
    event = await stripeForSignatures().webhooks.constructEventAsync(raw, sig, secret, undefined, cryptoProvider);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.livemode && !liveStripeAllowed()) {
    // Safety: never act on live events before ship day.
    return NextResponse.json({ received: true, ignored: "livemode event while live Stripe not allowed" });
  }

  const stripe = getStripe();
  const result = await processStripeEvent(
    await getMembersDb(),
    event,
    stripe ? async (id) => (await stripe.subscriptions.retrieve(id)) as never : undefined,
  );
  return NextResponse.json({ received: true, ...result });
}
