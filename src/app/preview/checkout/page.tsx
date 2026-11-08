import { notFound } from "next/navigation";
import { PLANS } from "@/lib/members/plans";
import { safeReturnTab } from "@/lib/members/previewFulfillment";
import { previewTierEnabled } from "@/lib/members/previewTier";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upgrade to paid membership", robots: { index: false, follow: false } };

export default async function PreviewCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!previewTierEnabled()) notFound();
  const tab = safeReturnTab(String((await searchParams)?.tab ?? "stocks"));
  const annual = PLANS.launch_annual;
  const monthly = PLANS.launch_monthly;
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Simulated preview</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Upgrade to paid membership</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Choose a founding plan. The next step is a Canary handoff, not a card form. Stripe is not called.
      </p>
      <form action="/api/preview/checkout" method="post" className="mt-6 rounded-2xl border border-canary-gold/40 bg-slate-950 p-5">
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="plan" value={annual.id} />
        <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Founding annual</p>
        <p className="mt-2 text-4xl font-semibold text-white">US$35<span className="text-lg text-slate-400">/mo</span></p>
        <p className="mt-1 text-sm text-slate-300">Billed annually · US$420/yr</p>
        <button type="submit" className="mt-4 w-full rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950">
          Upgrade to paid membership
        </button>
      </form>
      <form action="/api/preview/checkout" method="post" className="mt-3 rounded-2xl border border-white/10 bg-slate-950 p-5">
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="plan" value={monthly.id} />
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Founding monthly</p>
        <p className="mt-2 text-2xl font-semibold text-white">{monthly.display}</p>
        <p className="mt-1 text-sm text-slate-400">{monthly.sub}</p>
        <button type="submit" className="mt-4 w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-white">
          Continue with monthly
        </button>
      </form>
    </div>
  );
}
