"use client";

import { useState } from "react";
import type { EngulfingHit } from "@/lib/loadEngulfing";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

function EngulfingBody() {
  return (
    <>
      <p>
        Bullish Engulfing looks for a classic two-candle reversal. The prior
        bar is red: it closed below where it opened. The latest completed bar
        is green: it closed above where it opened. The green body covers the
        whole red body (it opens at or below the red close, and closes at or
        above the red open) and is strictly larger. The wicks are ignored, and
        there is no extra &ldquo;must already be falling&rdquo; filter.
      </p>
      <p>
        <strong className="text-white">Daily</strong> uses the last five
        completed sessions and drops today&apos;s bar until that session has
        closed. <strong className="text-white">Weekly</strong> uses the last
        three completed weeks and drops the week that is still forming, until
        Friday&apos;s close. A name can appear more than once if the pattern
        printed on more than one of those bars.
      </p>
      <p>
        <strong className="text-white">Bars</strong> is how many completed bars
        have printed since the green candle. <strong className="text-white">%</strong> is
        the latest completed close versus that green candle&apos;s close.{" "}
        <strong className="text-white">Body</strong> is the green body divided
        by the red body (bigger than 1). <strong className="text-white">Also</strong> shows
        🐟 when the name is in Time to fish, and 💵 when it has an MFI washout
        in the last five sessions.
      </p>
      <p>
        The same pattern is one 🕯️ mark on Bullish Setups when it printed on a
        daily bar in that five-session window or on a weekly bar in those three
        weeks. Daily and weekly together are still one mark.
      </p>
      <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
    </>
  );
}

function pctText(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

function AlignMarks({ fish, mfi }: { fish: boolean; mfi: boolean }) {
  if (!fish && !mfi) return <span className="text-slate-600">—</span>;
  return (
    <span className="inline-flex gap-0.5" title={[fish ? "Also in Time to fish" : "", mfi ? "Also an MFI washout" : ""].filter(Boolean).join(" · ")}>
      {fish ? <span aria-label="Also in Time to fish">🐟</span> : null}
      {mfi ? <span aria-label="Also an MFI washout">💵</span> : null}
    </span>
  );
}

export function EngulfingScanner({
  daily,
  weekly,
  asOf,
  weeklyAsOf,
  fishTickers = [],
  mfiTickers = [],
}: {
  daily: EngulfingHit[];
  weekly: EngulfingHit[];
  asOf: string | null;
  weeklyAsOf: string | null;
  /** Tickers currently in the Fish box (fish or both). */
  fishTickers?: string[];
  /** Tickers with an MFI washout in the recent session window. */
  mfiTickers?: string[];
}) {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const rows = tab === "daily" ? daily : weekly;
  const markAsOf = tab === "daily" ? asOf : weeklyAsOf;
  const fish = new Set(fishTickers);
  const mfi = new Set(mfiTickers);
  const pending = !asOf && !weeklyAsOf && daily.length === 0 && weekly.length === 0;
  const emptyCopy = pending
    ? "No scan yet. The list fills after the engulfing scan runs."
    : tab === "daily"
      ? "No bullish engulfing candles in the last 5 completed sessions."
      : "No bullish engulfing candles in the last 3 completed weeks.";

  return (
    <article
      id="bullish-engulfing"
      className="flex max-h-[min(320px,40vh)] min-w-0 flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading="How Bullish Engulfing works"
            subheading="Bodies only · daily and weekly · education only"
            body={<EngulfingBody />}
          >
            🕯️ Bullish Engulfing
          </HowItWorksTitle>
        </h3>
        <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">
          {markAsOf ? `as of ${markAsOf}` : "bodies only"}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Bullish Engulfing timeframe"
        className="mt-2 inline-flex shrink-0 self-start rounded-lg border border-white/10 bg-slate-950/70 p-0.5 text-[11px]"
      >
        {(
          [
            ["daily", "Daily"],
            ["weekly", "Weekly"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              tab === id ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{emptyCopy}</p>
      ) : (
        <div className="mt-2 min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-left text-[10px] text-slate-300">
            <thead className="sticky top-0 bg-slate-900/95 text-[9px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Ticker</th>
                <th className="py-1 pr-2 font-medium" title="Date of the green engulfing candle">
                  Mark
                </th>
                <th className="py-1 pr-2 text-right font-medium" title="Completed bars since the green candle">
                  Bars
                </th>
                <th className="py-1 pr-2 text-right font-medium" title="Close of the green engulfing candle">
                  Close
                </th>
                <th className="py-1 pr-2 text-right font-medium" title="Latest completed close versus the engulfing close">
                  %
                </th>
                <th className="py-1 pr-2 text-right font-medium" title="Green body divided by the prior red body">
                  Body
                </th>
                <th className="py-1 font-medium" title="Also in Time to fish or MFI washout">
                  Also
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pctCls =
                  r.pctFromClose > 0 ? "text-emerald-300" : r.pctFromClose < 0 ? "text-rose-300" : "text-slate-400";
                return (
                  <tr key={`${r.timeframe}-${r.ticker}-${r.asOf}`} className="border-t border-white/5">
                    <td className="py-1 pr-2">
                      <TickerLink ticker={r.ticker} interval={tab === "weekly" ? "W" : "D"} className="font-semibold tracking-wide text-white" />
                    </td>
                    <td className="py-1 pr-2 tabular-nums text-slate-400" title={r.asOf}>
                      {r.asOf.slice(5)}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.barsSince}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.close}</td>
                    <td className={`py-1 pr-2 text-right tabular-nums ${pctCls}`}>{pctText(r.pctFromClose)}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.bodyRatio.toFixed(2)}×</td>
                    <td className="py-1">
                      <AlignMarks fish={fish.has(r.ticker)} mfi={mfi.has(r.ticker)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
