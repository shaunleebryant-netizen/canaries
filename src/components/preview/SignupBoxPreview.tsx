"use client";

import { useState } from "react";
import { FOUNDING_BENEFITS } from "@/lib/foundingBenefits";

/**
 * Isolated homepage signup-box preview. Benefits are the live join-card lines
 * and FOUNDING_BENEFITS. Prices are the existing founding plans. This component
 * is not mounted by the homepage, /signup, or checkout.
 */
const FREE_BENEFITS = [
  "Limited free access",
  "ETF tab and ETF charts",
  "Current market regime & composite score",
] as const;

type Plan = "free" | "paid";
type Billing = "annual" | "monthly";

function nextStep(plan: Plan, billing: Billing): string {
  if (plan === "free") {
    return "Preview only. Next step would be Create your account, step 1 of 2. No signup was sent and nothing is charged.";
  }
  if (billing === "monthly") {
    return "Preview only. Next step would be Create your account, step 1 of 2, then founding monthly at US$70 per month. No signup or payment was started.";
  }
  return "Preview only. Next step would be Create your account, step 1 of 2, then founding annual at US$420 per year. No signup or payment was started.";
}

export function SignupBoxPreview() {
  const [plan, setPlan] = useState<Plan>("paid");
  const [billing, setBilling] = useState<Billing>("annual");
  const [notice, setNotice] = useState<string | null>(null);

  function choosePlan(next: Plan) {
    setPlan(next);
    setNotice(null);
  }

  function chooseBilling(next: Billing) {
    setPlan("paid");
    setBilling(next);
    setNotice(null);
  }

  return (
    <div className="bg-slate-950 px-4 py-10 text-slate-100">
      <div id="signup-box-preview" className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-sky-400/60 via-sky-500/20 to-amber-500/60 p-[2px]">
        <div className="rounded-[calc(1.5rem-2px)] bg-slate-950/95 px-5 py-8 text-left sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canary-gold">Preview only · not the live homepage</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Join us and be among our Founding Members</h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Free or Paid">
            <div
              role="radio"
              aria-checked={plan === "free"}
              tabIndex={0}
              onClick={() => choosePlan("free")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  choosePlan("free");
                }
              }}
              className={`order-2 cursor-pointer rounded-xl border p-4 ${plan === "free" ? "border-canary-gold bg-amber-500/10 ring-1 ring-canary-gold/50" : "border-white/10"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-white">Free</p>
                {plan === "free" ? <span className="rounded-full bg-canary-gold px-2 py-0.5 text-[10px] font-bold uppercase text-slate-950">Selected</span> : null}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-300">
                {FREE_BENEFITS.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-canary-gold" aria-hidden>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              role="radio"
              aria-checked={plan === "paid"}
              tabIndex={0}
              onClick={() => choosePlan("paid")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  choosePlan("paid");
                }
              }}
              className={`order-1 cursor-pointer rounded-xl border p-4 ${plan === "paid" ? "border-canary-gold bg-amber-500/10 ring-1 ring-canary-gold/50" : "border-white/10"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-white">Paid</p>
                {plan === "paid" ? <span className="rounded-full bg-canary-gold px-2 py-0.5 text-[10px] font-bold uppercase text-slate-950">Selected</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Paid billing">
                <button
                  type="button"
                  aria-pressed={plan === "paid" && billing === "annual"}
                  onClick={(event) => {
                    event.stopPropagation();
                    chooseBilling("annual");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${plan === "paid" && billing === "annual" ? "bg-canary-gold text-slate-950" : "border border-white/20 text-white"}`}
                >
                  Annual
                </button>
                <button
                  type="button"
                  aria-pressed={plan === "paid" && billing === "monthly"}
                  onClick={(event) => {
                    event.stopPropagation();
                    chooseBilling("monthly");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${plan === "paid" && billing === "monthly" ? "bg-canary-gold text-slate-950" : "border border-white/20 text-white"}`}
                >
                  Monthly
                </button>
              </div>

              <div>
                <p className={billing === "annual" ? "mt-3 text-2xl font-bold text-white" : "mt-3 text-base font-semibold text-slate-300"}>US$420 per year</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">Equivalent to US$35/month, billed annually</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">Not subject to future price increases</p>
              </div>
              <p className={plan === "paid" && billing === "monthly" ? "mt-3 text-2xl font-bold text-white" : "mt-3 text-base font-semibold text-slate-300"}>US$70 per month</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">After the first 100: US$99/mo or US$1,069/yr.</p>

              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-200">
                {FOUNDING_BENEFITS.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-canary-gold" aria-hidden>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-canary-gold px-8 py-4 text-center text-base font-bold text-slate-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.7)] hover:bg-amber-400"
            onClick={() => setNotice(nextStep(plan, billing))}
          >
            Create account
          </button>
          {notice ? (
            <p role="status" className="mt-3 text-sm leading-relaxed text-amber-100">{notice}</p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-500">Choosing a card and Create account stays on this preview. It does not open signup or payment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
