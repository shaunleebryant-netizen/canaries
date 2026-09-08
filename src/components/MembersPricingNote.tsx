"use client";

import { StripeStubButton } from "@/components/StripeStubButton";

/** Visible production-price note + stub checkout (no live charge). */
export function MembersPricingNote({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "mx-auto mt-6 max-w-sm rounded-2xl border border-canary-gold/30 bg-amber-500/10 p-4 text-left"
          : "mt-6 rounded-2xl border border-canary-gold/30 bg-amber-500/10 p-5"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
        Membership pricing
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">
        Production entitlement:{" "}
        <span className="font-semibold text-white">US$50 / month</span> via Stripe.
        Design mode only — checkout is stubbed; no live charge.
      </p>
      <div className="mt-3">
        <StripeStubButton
          product="dashboard"
          label="Stub checkout · US$50/mo (no charge)"
        />
      </div>
    </div>
  );
}
