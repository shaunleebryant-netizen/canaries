/**
 * LOCAL-ONLY Stripe mock (STRIPE_MOCK=1, non-production, accounts mode).
 * Builds Stripe-shaped events, signs them exactly like Stripe does (t=...,v1=HMAC-SHA256)
 * and POSTs them to our real /api/stripe/webhook so signature verification + D1 updates
 * are exercised end-to-end. No Stripe API is called; nothing is charged.
 */
import { randomToken } from "./crypto";
import { stripeForSignatures, webhookSecret, cryptoProvider } from "./stripe";

export async function sendSignedEvent(origin: string, type: string, object: Record<string, unknown>) {
  const created = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_mock_${randomToken(12)}`,
    object: "event",
    api_version: "2025-02-24.acacia",
    created,
    livemode: false,
    type,
    data: { object },
  });
  const header = await stripeForSignatures().webhooks.generateTestHeaderStringAsync({
    payload,
    secret: webhookSecret()!,
    timestamp: created,
    cryptoProvider,
  });
  const res = await fetch(`${origin}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });
  return { type, status: res.status, body: await res.json().catch(() => null) };
}

export const TEST_CARDS: Record<string, { ok: boolean; message: string }> = {
  "4242424242424242": { ok: true, message: "Succeeded" },
  "4000000000000002": { ok: false, message: "Your card was declined. (test card: generic_decline)" },
  "4000000000009995": { ok: false, message: "Your card has insufficient funds. (test card)" },
};
