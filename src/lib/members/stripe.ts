import Stripe from "stripe";
import { liveStripeAllowed, stripeKeyMode, stripeMockEnabled } from "./config";

/** Local-only webhook secret for the mock (never used when STRIPE_MOCK is off / in production). */
const MOCK_WEBHOOK_SECRET = "whsec_mock_local_only_not_a_real_secret";

export function webhookSecret(): string | null {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET;
  if (stripeMockEnabled()) return MOCK_WEBHOOK_SECRET;
  return null;
}

/** Real Stripe client (Workers-compatible fetch client). Refuses live keys unless explicitly allowed. */
export function getStripe(): Stripe | null {
  const mode = stripeKeyMode();
  if (mode === "none" || mode === "unknown") return null;
  if (mode === "live" && !liveStripeAllowed()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2025-02-24.acacia",
  });
}

/** Client used only for signature verification/generation (no API calls, no key needed). */
export function stripeForSignatures(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_signature_only", {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2025-02-24.acacia",
  });
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export function billingBackend(): "mock" | "stripe" | "unconfigured" {
  if (stripeMockEnabled()) return "mock";
  return getStripe() ? "stripe" : "unconfigured";
}
