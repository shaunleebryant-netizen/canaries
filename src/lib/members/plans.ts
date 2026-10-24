/**
 * Dashboard membership plans (owner update 2026-09-25). All USD. Annual is the default/priority plan.
 *   Founding (first 100): $600/yr billed annually, rate locked for life while renewing.
 *   After 100: Standard annual $1,069/yr (default, highlighted) or Standard monthly $99/mo.
 * Price IDs come ONLY from env (never hard-coded). Stripe lookup_keys are used by
 * scripts/stripe-sandbox-setup.mjs. Public page copy is NOT changed yet — see
 * docs/ops/pricing-copy-proposal.md.
 */
export type PlanId = "launch_annual" | "launch_monthly" | "standard_annual" | "standard_monthly";

/** Founding plans: both count toward the first-100 cap (countLaunchMembers in db.ts). */
export const FOUNDING_PLAN_IDS: PlanId[] = ["launch_annual", "launch_monthly"];

/**
 * LIVE Stripe price IDs (owner, verified 2026-10-14). Not secrets. Used only as a fallback when
 * the matching env var is unset AND the Stripe key in use is a live key, so test/mock runs are
 * unaffected. Env vars always win. Indicator one-off (US$99) = STRIPE_PRICE_TV_INDICATORS.
 */
export const LIVE_PRICE_IDS: Record<string, string> = {
  STRIPE_PRICE_DASHBOARD: "price_1UQLwh51XxEMe5QTH3ZxrvWG", // Founding annual US$600/yr
  STRIPE_PRICE_DASHBOARD_FOUNDING_MONTHLY: "price_1UQLxc51XxEMe5QT9RKaFgI8", // Founding monthly US$75/mo
  STRIPE_PRICE_DASHBOARD_STANDARD_ANNUAL: "price_1UQLzO51XxEMe5QTCMWLb9uT", // Standard annual US$1,069/yr
  STRIPE_PRICE_DASHBOARD_STANDARD: "price_1UQLyS51XxEMe5QTgWtvmwFw", // Standard monthly US$99/mo
  STRIPE_PRICE_TV_INDICATORS: "price_1UQM1P51XxEMe5QTiaKn49wZ", // Indicators one-off US$99 (prod_VREUbizg8tJcUN)
};

/** env var, else the live default when running with a live key. */
export function priceFromEnv(envName: string): string | undefined {
  const v = process.env[envName];
  if (v) return v;
  const k = process.env.STRIPE_SECRET_KEY || "";
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) return LIVE_PRICE_IDS[envName];
  return undefined;
}

export type Plan = {
  id: PlanId;
  label: string;
  priceEnv: string;
  lookupKey: string;
  display: string;
  sub: string;
  note: string;
  /** Minor units, USD. Used by the local Stripe mock and for display consistency. */
  amount: number;
  interval: "year" | "month";
  highlight: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  launch_annual: {
    id: "launch_annual",
    label: "Founding member — first 100",
    priceEnv: "STRIPE_PRICE_DASHBOARD",
    lookupKey: "canary_founding_annual_usd",
    display: "$600/yr",
    sub: "Billed annually (USD) · rate locked for life while you renew",
    note: "Turn off auto-renew at any time and keep your access to the end of the paid year.",
    amount: 60000,
    interval: "year",
    highlight: true,
  },
  launch_monthly: {
    id: "launch_monthly",
    label: "Founding member — monthly",
    priceEnv: "STRIPE_PRICE_DASHBOARD_FOUNDING_MONTHLY",
    lookupKey: "canary_founding_monthly_usd",
    display: "$75/mo",
    sub: "Billed monthly (USD) · founding rate while you renew",
    note: "Turning off auto-renew keeps access to the end of the paid month.",
    amount: 7500,
    interval: "month",
    highlight: false,
  },
  standard_annual: {
    id: "standard_annual",
    label: "Standard — annual",
    priceEnv: "STRIPE_PRICE_DASHBOARD_STANDARD_ANNUAL",
    lookupKey: "canary_standard_annual_usd",
    display: "$1,069/yr",
    sub: "Billed annually (USD) · best value",
    note: "Turn off auto-renew at any time and keep your access to the end of the paid year.",
    amount: 106900,
    interval: "year",
    highlight: true,
  },
  standard_monthly: {
    id: "standard_monthly",
    label: "Standard — monthly",
    priceEnv: "STRIPE_PRICE_DASHBOARD_STANDARD",
    lookupKey: "canary_standard_monthly_usd",
    display: "$99/mo",
    sub: "Billed monthly (USD)",
    note: "Turning off auto-renew keeps access to the end of the paid month.",
    amount: 9900,
    interval: "month",
    highlight: false,
  },
};

/** Plans offered right now, in display order (annual first). */
export function offeredPlans(launchOpen: boolean): Plan[] {
  return launchOpen ? [PLANS.launch_annual, PLANS.launch_monthly] : [PLANS.standard_annual, PLANS.standard_monthly];
}

/** Default plan when none (or an unavailable one) is requested. */
export function resolvePlan(requested: unknown, launchOpen: boolean): PlanId {
  if (launchOpen) return requested === "launch_monthly" ? "launch_monthly" : "launch_annual";
  if (requested === "standard_monthly") return "standard_monthly";
  return "standard_annual";
}

export function priceIdFor(plan: PlanId): string | undefined {
  return priceFromEnv(PLANS[plan].priceEnv);
}

export function planForPriceId(priceId: string | null | undefined): PlanId | "unknown" {
  if (!priceId) return "unknown";
  for (const p of Object.values(PLANS)) if (priceIdFor(p.id) === priceId) return p.id;
  if (priceId.startsWith("price_mock_")) {
    const id = priceId.slice("price_mock_".length) as PlanId;
    if (id in PLANS) return id;
  }
  return "unknown";
}

export function isPlanId(s: unknown): s is PlanId {
  return s === "launch_annual" || s === "launch_monthly" || s === "standard_annual" || s === "standard_monthly";
}
