import { NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PRODUCTS: Record<string, { envPrice: string; label: string }> = {
  weekly_letter: { envPrice: "STRIPE_PRICE_WEEKLY_LETTER", label: "Weekly canary letter" },
  dashboard: { envPrice: "STRIPE_PRICE_DASHBOARD", label: "Members dashboard" },
  tv_indicators: { envPrice: "STRIPE_PRICE_TV_INDICATORS", label: "TradingView indicators" },
  tuition: { envPrice: "STRIPE_PRICE_TUITION_SESSION", label: "1-on-1 tuition slot" },
};

/**
 * Stripe Checkout stub. Without STRIPE_SECRET_KEY → no-op JSON (no live charges).
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: false,
      stub: true,
      message: "Stripe keys missing — checkout stub (no charge).",
    });
  }

  let product = "weekly_letter";
  try {
    const body = await request.json();
    product = String(body.product || product);
  } catch {
    /* use default */
  }

  const meta = PRODUCTS[product];
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Unknown product" }, { status: 400 });
  }

  const priceId = process.env[meta.envPrice];
  if (!priceId) {
    return NextResponse.json({
      ok: false,
      stub: true,
      message: `Price ID for ${meta.label} not configured — stub (no charge).`,
    });
  }

  // Keys present: still refuse live session creation in this scaffold.
  // Owner next step: wire stripe.checkout.sessions.create here.
  return NextResponse.json({
    ok: false,
    stub: true,
    message:
      "Scaffold only — Checkout session creation not wired. No live charges.",
    product,
    priceIdConfigured: true,
  });
}
