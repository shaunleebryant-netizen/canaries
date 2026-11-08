/** Generic stand-in. No tickers, scores, or paid lists are rendered here. */
export function LimitedAccessNotice({ tab, tabId }: { tab: string; tabId: string }) {
  return (
    <section className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10" aria-labelledby={`lock-${tabId}`}>
      <div aria-hidden className="pointer-events-none select-none p-4 blur-md">
        <div className="mb-3 h-4 w-40 rounded bg-slate-700/80" />
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-3 rounded-lg bg-slate-800/80 px-3 py-3">
              <div className="h-3 w-16 rounded bg-slate-600" />
              <div className="h-3 flex-1 rounded bg-slate-700" />
              <div className="h-3 w-10 rounded bg-slate-600" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-canary-gold/40 bg-slate-950/95 p-5 text-center shadow-xl">
          <h2 id={`lock-${tabId}`} className="text-lg font-semibold text-white">
            <span className="sr-only">{tab}. </span>
            Upgrade to paid membership
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">Upgrade to paid to become a member.</p>
          <form action="/api/account/checkout" method="post" className="mt-4">
            <input type="hidden" name="tab" value={tabId} />
            <input type="hidden" name="plan" value="launch_annual" />
            <button type="submit" className="w-full rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950">
              Upgrade to paid membership
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-400">
            <a className="underline" href="/signup">
              Founding monthly is US$70/mo
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

export function LockedUniverseButton() {
  return (
    <form action="/api/account/checkout" method="post">
      <input type="hidden" name="tab" value="stocks" />
      <input type="hidden" name="plan" value="launch_annual" />
      <button
        type="submit"
        className="whitespace-nowrap rounded-lg border border-[#eab308]/40 px-3 py-1.5 text-xs font-medium text-[#eab308] hover:bg-[#eab308]/10"
      >
        Ticker Universe
      </button>
    </form>
  );
}
