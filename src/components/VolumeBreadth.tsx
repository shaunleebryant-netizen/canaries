import type { VolumeBreadthResult, VolumeBreadthRegime } from "@/lib/volumeBreadth";

const REGIME_PILL: Record<VolumeBreadthRegime, string> = {
  RISK_ON: "bg-emerald-500 text-slate-950 ring-emerald-400/40",
  RISK_OFF: "bg-orange-500 text-white ring-orange-400/40",
  NO_REGIME: "bg-slate-600 text-slate-100 ring-slate-500/40",
  PENDING: "border border-dashed border-amber-400/40 bg-amber-500/10 text-amber-100",
};

function formatRegime(r: VolumeBreadthRegime): string {
  switch (r) {
    case "RISK_ON":
      return "Risk-on volume";
    case "RISK_OFF":
      return "Risk-off volume";
    case "NO_REGIME":
      return "No regime";
    case "PENDING":
      return "PENDING";
  }
}

function fmt(n: number | null, digits = 3): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

export function VolumeBreadth({ data }: { data: VolumeBreadthResult }) {
  const isPending = data.status === "PENDING";
  const isPartial = data.status === "PARTIAL";

  return (
    <section
      id="volume-breadth"
      className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
            NYSE Volume Advancers vs Decliners
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            (UVOL − DVOL) / (UVOL + DVOL), then 13 EMA / 34 EMA.
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            Entire NYSE up/down volume. Used as liquidity gauge.
            {data.draft ? " · draft" : ""}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          {data.asOf ? `as of ${data.asOf}` : "as of —"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-5 py-2 text-base font-bold tracking-wide ring-4 ${REGIME_PILL[data.regime]}`}
        >
          {formatRegime(data.regime)}
        </span>
        {!isPending || data.ratio != null ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200">
              <span className="text-slate-500">Ratio</span>
              <span className="font-semibold tabular-nums text-white">
                {fmt(data.ratio)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200">
              <span className="text-slate-500">EMA 13/34</span>
              <span className="font-semibold tabular-nums text-white">
                {fmt(data.ema13)} / {fmt(data.ema34)}
              </span>
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-snug text-slate-300">{data.oneLiner}</p>

      {isPending || isPartial ? (
        <div className="mt-4 rounded-xl border border-dashed border-amber-400/25 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
          <p className="font-semibold text-amber-200">
            {isPartial ? "Ratio live · EMA regime pending history" : "Awaiting UVOL / DVOL feed"}
          </p>
          <p className="mt-1 text-slate-400">
            {data.pendingReason ??
              "Yahoo does not currently expose clean NYSE up/down volume symbols. Rules below still apply once a feed is wired — no invented prints."}
          </p>
          {data.symbolsTried.length > 0 ? (
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              Tried: {data.symbolsTried.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        <span className="font-semibold text-slate-300">Rules:</span> Above 0 and
        13 &gt; 34 = real risk-on volume · Below 0 and 13 &lt; 34 = real
        risk-off volume · Cross near 0 with a flat 34 = no regime, ignore.
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
          How to read this box (new traders)
        </summary>
        <ul className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
          <li>
            <span className="font-medium text-slate-300">Pair with price trend:</span>{" "}
            positive volume regime + index above its 50-day is confirmation;
            negative volume regime while the index makes new highs is the
            warning.
          </li>
          <li>
            Formula (TradingView):{" "}
            <span className="font-mono text-slate-300">
              (USI:UVOL − USI:DVOL) / (USI:UVOL + USI:DVOL)
            </span>
            , then 13 EMA / 34 EMA
          </li>
        </ul>
      </details>
    </section>
  );
}
