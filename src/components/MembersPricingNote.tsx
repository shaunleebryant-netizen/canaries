"use client";

/** Visible production-price note + link to create an account (checkout is on Stripe). */
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
        First 100:{" "}
        <span className="font-semibold text-white">$600/yr</span> (US$50/mo, billed
        annually), locked for life while renewing. After 100:{" "}
        <span className="font-semibold text-white">$1,069/yr</span> or{" "}
        <span className="font-semibold text-white">$99/mo</span> monthly.
      </p>
      <div className="mt-3">
        <a
          href="/account/signup"
          className="inline-block rounded-xl bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
        >
          Create account
        </a>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Already a member?{" "}
        <a href="/account/login" className="text-canary-gold hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
