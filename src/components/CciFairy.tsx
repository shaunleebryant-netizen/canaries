"use client";

import type { FairyRow } from "@/lib/loadCciFairy";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

function Body() {
  return (
    <>
      <p>
        Bottom Zone lists stocks in the Canary universe where three things lined up on a completed daily bar:
        the <strong className="text-white">Williams Vix Fix</strong> (how far the low sits under the highest close of
        the last 22 days) pushed above its 20-day band (1.5 standard deviations), <strong className="text-white">RSI(14)
        dipped under 35</strong> in the last 3 bars, and the bar <strong className="text-white">closed above its open</strong>.
        That is the bar the 🧚 prints on the chart.
      </p>
      <p>
        Together they are a study mark that selling looked stretched and buyers showed up that day. Names stay in
        the box for 5 sessions; the newest prints sit at the top. A 🧚 print also counts as a condition in
        Bullish Setups.
      </p>
      <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
    </>
  );
}

export function CciFairy({ rows, asOf }: { rows: FairyRow[]; asOf: string | null }) {
  return (
    <article
      id="cci-fairy"
      className="flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle heading="How Bottom Zone works" subheading="WVF extreme + RSI under 35 + up close · education only" body={<Body />}>
            Bottom Zone 🧚
          </HowItWorksTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Last 5 sessions</p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">No 🧚 prints in the last 5 sessions.</p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {rows.map((a) => (
            <li key={`${a.ticker}-${a.asOf}`} className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs">
              <TickerLink ticker={a.ticker} />
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${a.asOf === asOf ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>
                {a.asOf === asOf ? "today" : `${a.sessionsAgo}d ago`}
              </span>
              <span className="ml-auto truncate tabular-nums text-[10px] text-slate-500">
                {a.close} · WVF {a.wvf} &gt; {a.wvfUpper} · RSI low {a.rsiMin3} · now {a.rsiNow}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 shrink-0 text-[10px] text-slate-500">WVF(22) above band + RSI(14) under 35 + close above open · study mark · counts toward Bullish Setups.</p>
    </article>
  );
}
