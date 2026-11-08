export function LimitedAccessNotice({ tab }: { tab: string }) {
  return (
    <section className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-6 text-center" aria-labelledby={`lock-${tab}`}>
      <h2 id={`lock-${tab}`} className="text-base font-semibold text-white">
        Limited free access
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">
        {tab} is part of a paid membership. This preview does not load that tab&apos;s lists or charts for a free account.
      </p>
      <a href="/signup" className="mt-4 inline-flex rounded-xl bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400">
        See paid membership
      </a>
    </section>
  );
}
