"use client";

import type { ReactNode } from "react";
import type { ExtremeRow } from "@/lib/loadNewHighsLows";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

function Body({ side }: { side: "highs" | "lows" }) {
  return (
    <>
      <p>
        {side === "highs" ? "New Highs" : "New Lows"} lists stocks in the Canary universe whose
        daily <strong className="text-white">closing</strong> price just went{" "}
        {side === "highs" ? "above" : "below"} every close of the past year (1Y), two years (2Y),
        or its whole trading history ({side === "highs" ? "ATH" : "ATL"}, only shown with at least
        three years of history). Stocks listed for under a year show in grey as &ldquo;since IPO&rdquo;.
      </p>
      <p>
        Only fresh prints count: the stock must not have made a new 1-year{" "}
        {side === "highs" ? "high" : "low"} in the previous 20 sessions, so names don&apos;t sit in the
        box every day.{" "}
        {side === "highs"
          ? "New highs often mark trend leadership."
          : "New lows often mark trend damage."}
      </p>
      <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
    </>
  );
}

const badge: Record<string, string> = {
  ATH: "bg-amber-400/20 text-amber-300",
  ATL: "bg-rose-500/20 text-rose-300",
  "2Y": "bg-emerald-500/15 text-emerald-300",
  "1Y": "bg-sky-500/15 text-sky-300",
  sinceIpo: "bg-slate-500/20 text-slate-400",
};

export function NewHighsLows({
  side,
  rows,
  riskOff,
}: {
  side: "highs" | "lows";
  rows: ExtremeRow[];
  riskOff?: boolean;
}) {
  const title: ReactNode = side === "highs" ? "New Highs" : "New Lows";
  const lowBadge = (k: string) => (side === "lows" && k !== "ATL" && k !== "sinceIpo" ? `${k} low` : k);
  return (
    <article
      id={`new-${side}`}
      className="flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading={`How ${side === "highs" ? "New Highs" : "New Lows"} works`}
            subheading="Fresh daily-close extremes · education only"
            body={<Body side={side} />}
          >
            {title}
          </HowItWorksTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {side === "highs" ? "Trend leadership" : "Trend damage"}
        </p>
      </div>
      {side === "highs" && riskOff && rows.length ? (
        <p className="mt-2 shrink-0 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200">
          Decide is Risk-Off — new highs can fail more often in this backdrop.
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No fresh {side === "highs" ? "highs" : "lows"} in the latest daily scan.
        </p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {rows.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}`}
              className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs"
            >
              <TickerLink ticker={a.ticker} />
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${side === "lows" && a.kind !== "sinceIpo" ? badge.ATL : (badge[a.kind] ?? badge["1Y"])}`}
                title={a.kind === "sinceIpo" ? "Under 1 year of history" : undefined}
              >
                {a.kind === "sinceIpo" ? "since IPO" : lowBadge(a.kind)}
              </span>
              <span className="ml-auto truncate tabular-nums text-[10px] text-slate-500">
                {a.close} · {a.pctVsPrior > 0 ? "+" : ""}
                {a.pctVsPrior}% vs {a.priorExtremeDate}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
