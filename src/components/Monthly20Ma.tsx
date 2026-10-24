import type { Monthly20Signal } from "@/lib/marketState";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

export function Monthly20Ma({
  signals,
  asOf,
}: {
  signals: Monthly20Signal[];
  asOf: string | null;
}) {
  return (
    <article
      id="monthly-20ma"
      className="flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading="How Monthly Trend works"
            subheading="Long-term trend turning up · monthly charts · education only"
            body={
              <>
                <p>
                  Monthly Trend lists stocks whose long-term trend has just
                  turned up. It looks at monthly charts and flags a stock when
                  its price moves back above its long-term moving average (its
                  typical price over the past couple of years).
                </p>
                <p>
                  Most names show up because this happened in the current
                  month. The month isn&apos;t finished yet, so the signal can
                  still undo. Names tagged &ldquo;last month&rdquo; turned up
                  in the month just gone and are still holding above.
                </p>
                <p>
                  It moves slowly, so it is best used to spot bigger trend
                  changes rather than for timing. The columns show the latest
                  price, the long-term average and how far above it the price
                  sits. Tap a ticker for a monthly chart.
                </p>
                <p className="text-xs text-slate-400">
                  Education only, not buy or sell advice.
                </p>
              </>
            }
          >
            Monthly Trend
          </HowItWorksTitle>
        </h3>
        <p className="text-right text-[10px] uppercase tracking-wide text-canary-gold/80">
          Trend turning up · monthly{asOf ? ` · ${asOf}` : ""}
        </p>
      </div>

      {signals.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No stocks turned their long-term monthly trend up this month or
          last month in the latest scan.
        </p>
      ) : (
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-0.5 text-left font-medium">Ticker</th>
                <th className="py-0.5 text-right font-medium">Close</th>
                <th className="py-0.5 text-right font-medium">Avg</th>
                <th className="py-0.5 text-right font-medium">% above</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr
                  key={s.ticker}
                  className="border-t border-white/5"
                  title={`Prior month ${s.prevClose != null ? fmt(s.prevClose) : "?"} vs average ${s.prevSma20 != null ? fmt(s.prevSma20) : "?"}`}
                >
                  <td className="py-1">
                    <span className="inline-flex items-center gap-1.5">
                      <TickerLink
                        ticker={s.ticker}
                        interval="M"
                        className="font-semibold tracking-wide text-white"
                      />
                      {s.cross === "last_month" ? (
                        <span className="rounded bg-slate-700/60 px-1 py-px text-[9px] uppercase tracking-wide text-slate-300">
                          last month
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-200">
                    {fmt(s.close)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-400">
                    {fmt(s.sma20)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-emerald-300">
                    +{s.pctAbove.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
