"use client";

import type { ReactNode } from "react";
import type { InsiderBuyingSignal } from "@/lib/loadInsiderBuying";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

/** Insider Buying sub scanner box (owner approved 2026-10-09, t595u). Members only. */

export function usd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 999_500) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  return `$${Math.round(n / 1e3)}k`;
}

/** Owner 2026-10-10: NZ-style DD/MM/YYYY, never US order. "2026-09-30" → "30/09/2026". */
export function dmy(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function InsiderCalcBody() {
  return (
    <>
      <p>
        How it&apos;s built: every night we read the SEC&apos;s Form 4 filings for each stock in our
        universe. We count only open-market purchases with the insider&apos;s own money (not option
        exercises, awards, gifts, or pre-planned 10b5-1 trades), and ignore any single buy under $25k.
      </p>
      <p>
        A stock appears if two or more insiders bought a combined $100k or more in the last 30 days,
        or if one CEO, CFO or director bought $250k or more in that time.
      </p>
      <p>
        Insiders file within 2 business days of trading, so the list runs a day or two behind.
      </p>
      <p className="text-xs text-slate-400">Education only.</p>
    </>
  );
}

function InsiderCalcTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <HowItWorksTitle
      heading="How Insider Buying works"
      subheading="From SEC Form 4 filings · education only"
      body={<InsiderCalcBody />}
      className={className}
    >
      {children}
    </HowItWorksTitle>
  );
}

/** Title-case SEC owner names ("KHOSROWSHAHI DARA" → "Khosrowshahi Dara"); mixed case is kept. */
export function niceName(n: string): string {
  return n === n.toUpperCase() ? n.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()) : n;
}

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Owner 2026-10-10: full-width box at the top of the members Insiders tab (moved from the Stocks tab
 * the same day; was a full-width row under the Sub Scanners grid) with a proper table, one row per buy
 * (insider + trade date), newest trade first, cluster buys (2+ distinct insiders in the window) flagged.
 * Mobile: the table scrolls sideways inside the box, so the page never widens.
 */
export function InsiderBuying({ signals, asOf }: { signals: InsiderBuyingSignal[]; asOf: string | null }) {
  const rows = signals
    .flatMap((s) =>
      (s.trades?.length
        ? s.trades
        : [{ name: s.buyers?.map((b) => b.name).join(", ") ?? "", roles: s.roles, txnDate: s.latestTxnDate, filingDate: s.latestFilingDate ?? "", shares: 0, avgPrice: 0, usd: s.totalUsd, url: "" }]
      ).map((t) => ({ ...t, ticker: s.ticker, cluster: s.insiders })),
    )
    .sort((a, b) => (a.txnDate !== b.txnDate ? (a.txnDate < b.txnDate ? 1 : -1) : b.usd - a.usd));
  const th = "whitespace-nowrap px-1.5 py-1.5 font-medium";
  const td = "whitespace-nowrap px-1.5 py-1.5";
  const tdWrap = "min-w-[7rem] px-1.5 py-1.5 leading-snug";
  return (
    <article
      id="insider-buying"
      className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-amber-500/10"
    >
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <InsiderCalcTitle>Insider Buying</InsiderCalcTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Open-market buys · last 30 days{asOf ? ` · to ${dmy(asOf)}` : ""} · newest first
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No notable insider buying in our stock universe over the last 30 days.
        </p>
      ) : (
        <div className="mt-2 max-h-[26rem] min-w-0 overflow-auto rounded-md border border-white/5">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 z-[1] bg-slate-950/95 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Ticker</th>
                <th className={th}>Insider</th>
                <th className={th}>Role</th>
                <th className={th}>Trade date</th>
                <th className={th}>Filed</th>
                <th className={`${th} text-right`}>Shares</th>
                <th className={`${th} text-right`}>Avg price</th>
                <th className={`${th} text-right`}>Value (US$)</th>
                <th className={`${th} text-right`} title="Distinct insiders buying this stock in the last 30 days">
                  Cluster
                </th>
                <th className={th}>SEC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.ticker}-${r.name}-${r.txnDate}-${i}`} className="border-t border-white/5 bg-slate-950/30 hover:bg-slate-900/80">
                  <td className={td}>
                    <span className="inline-flex items-center gap-1">
                      <TickerLink ticker={r.ticker} />
                    </span>
                  </td>
                  <td className={`${tdWrap} text-slate-200`}>{niceName(r.name)}</td>
                  <td className={`${tdWrap} min-w-[5.5rem] text-slate-400`}>{r.roles.join(", ")}</td>
                  <td className={`${td} tabular-nums text-slate-300`}>{dmy(r.txnDate)}</td>
                  <td className={`${td} tabular-nums text-slate-400`}>{dmy(r.filingDate)}</td>
                  <td className={`${td} text-right tabular-nums text-slate-300`}>{r.shares ? r.shares.toLocaleString("en-US") : "—"}</td>
                  <td className={`${td} text-right tabular-nums text-slate-300`}>{r.avgPrice ? money(r.avgPrice) : "—"}</td>
                  <td className={`${td} text-right tabular-nums font-semibold text-white`} title={money(r.usd)}>
                    {usd(r.usd)}
                  </td>
                  <td className={`${td} text-right`}>
                    {r.cluster >= 2 ? (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        {r.cluster} · cluster
                      </span>
                    ) : (
                      <span className="tabular-nums text-slate-500">1</span>
                    )}
                  </td>
                  <td className={td}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline-offset-2 hover:underline">
                        Form 4 ↗
                      </a>
                    ) : (
                      "—"
                    )}
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
