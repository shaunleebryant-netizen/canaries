import { PLANS } from "@/lib/members/plans";

const annual = PLANS.launch_annual;
const monthly = PLANS.launch_monthly;
const annualPerMonth = annual.amount / 100 / 12;

/**
 * Founding price pair. Annual billing is the primary choice.
 * Monthly stays available, in smaller muted type, so it does not read as a second plan.
 * Amounts come from the plan catalog. The signup link is unchanged.
 */
export function HomeFoundingOffer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col justify-center rounded-2xl border border-canary-gold/40 bg-slate-950 p-6 shadow-lg sm:p-8 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-canary-gold">
        Founding membership · first 100 members
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">Join as a founding member</h2>

      <div className="mt-5 rounded-xl border border-canary-gold/50 bg-gradient-to-b from-amber-500/15 to-slate-950 p-4 ring-1 ring-canary-gold/25">
        <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Billed annually</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-white">
          US${annualPerMonth}
          <span className="text-lg font-semibold text-slate-300">/mo</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">billed annually ({annual.display})</p>
      </div>

      <p className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-400">
        {monthly.display}
        <span className="ml-2 text-xs font-normal text-slate-500">billed monthly</span>
      </p>

      <p className="mt-4 text-sm text-slate-300">
        Annual rate locked for life while you renew. After the first 100: US$99/mo or US$1,069/yr.
      </p>
      <a
        href="/signup"
        className="mt-5 block rounded-xl bg-canary-gold px-6 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-yellow-400"
      >
        Claim your founding spot
      </a>
      <p className="mt-3 text-xs text-slate-500">Educational market data only. Not financial advice.</p>
    </div>
  );
}
