#!/usr/bin/env node
/**
 * Idempotent Stripe SANDBOX setup for Canary Dashboard members.
 * Reads the key from env STRIPE_TEST_SECRET_KEY (never from files). Refuses anything but sk_test_.
 *
 *   node scripts/stripe-sandbox-setup.mjs
 *
 * DO NOT RUN until the owner has set up billing (owner 2026-09-25).
 *
 * Creates/reuses (by lookup_key) — pricing per owner update 2026-09-25, all USD:
 *   canary_founding_annual_usd   $600.00 / year   Founding, first 100, rate locked for life
 *   canary_standard_annual_usd  $1,069.00 / year  Standard annual (default after 100)
 *   canary_standard_monthly_usd   $99.00 / month  Standard monthly
 * Configures the default Customer Portal: cancel at period end only (no proration/refund),
 * payment method update, invoice history. Prints price IDs (not secrets).
 */
import Stripe from "stripe";

const key = process.env.STRIPE_TEST_SECRET_KEY || "";
if (!key.startsWith("sk_test_")) {
  console.error("STRIPE_TEST_SECRET_KEY missing or NOT a test key — refusing.");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
const RETURN_URL = process.env.MEMBERS_SITE_ORIGIN ? `${process.env.MEMBERS_SITE_ORIGIN}/account` : "http://localhost:3100/account";

const PLANS = [
  {
    lookup_key: "canary_founding_annual_usd",
    env: "STRIPE_PRICE_DASHBOARD",
    product: { name: "Canary Dashboard — Founding member (first 100)", metadata: { app: "canary", plan: "launch_annual" } },
    unit_amount: 60000,
    interval: "year",
    nickname: "Founding annual $600/yr (rate locked for life while renewing)",
  },
  {
    lookup_key: "canary_standard_annual_usd",
    env: "STRIPE_PRICE_DASHBOARD_STANDARD_ANNUAL",
    product: { name: "Canary Dashboard — Standard", metadata: { app: "canary", plan: "standard" } },
    unit_amount: 106900,
    interval: "year",
    nickname: "Standard annual $1,069/yr",
  },
  {
    lookup_key: "canary_standard_monthly_usd",
    env: "STRIPE_PRICE_DASHBOARD_STANDARD",
    product: { name: "Canary Dashboard — Standard", metadata: { app: "canary", plan: "standard" } },
    unit_amount: 9900,
    interval: "month",
    nickname: "Standard monthly $99/mo",
  },
];

const out = {};
for (const p of PLANS) {
  const existing = await stripe.prices.list({ lookup_keys: [p.lookup_key], active: true, limit: 1 });
  let price = existing.data[0];
  if (price) {
    console.log(`reuse  ${p.lookup_key}: ${price.id}`);
  } else {
    const found = await stripe.products.search({ query: `metadata['app']:'canary' AND metadata['plan']:'${p.product.metadata.plan}' AND active:'true'` });
    const product = found.data[0] ?? (await stripe.products.create(p.product));
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: p.unit_amount,
      recurring: { interval: p.interval },
      lookup_key: p.lookup_key,
      nickname: p.nickname,
      metadata: p.product.metadata,
    });
    console.log(`create ${p.lookup_key}: ${price.id} (product ${product.id})`);
  }
  out[p.env] = price.id;
}

const portalFeatures = {
  subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none", cancellation_reason: { enabled: true, options: ["too_expensive", "unused", "other"] } },
  payment_method_update: { enabled: true },
  invoice_history: { enabled: true },
  customer_update: { enabled: false },
  subscription_update: { enabled: false },
};
const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
const params = {
  business_profile: { headline: "Canary Dashboard — manage your membership" },
  features: portalFeatures,
  default_return_url: RETURN_URL,
};
const cfg = configs.data[0]
  ? await stripe.billingPortal.configurations.update(configs.data[0].id, params)
  : await stripe.billingPortal.configurations.create(params);
console.log(`portal configuration ${cfg.id}: cancel=${cfg.features.subscription_cancel.mode}, pm_update=${cfg.features.payment_method_update.enabled}`);
console.log("\nLocal-only env (shell vars, NOT .env.local):");
for (const [k, v] of Object.entries(out)) console.log(`  ${k}=${v}`);
