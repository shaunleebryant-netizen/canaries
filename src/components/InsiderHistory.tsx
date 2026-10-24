"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { InsiderHistoryRow } from "@/lib/loadInsiderHistory";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";
import { dmy, money, niceName, usd } from "@/components/InsiderBuying";

/**
 * Past insider buys (3 months) — owner 2026-10-10. Members Insiders tab, full-width box under
 * Insider Buying. One row per buy (insider + trade date), newest first, 15 rows then "Show more".
 * Sortable by trade date, filed date, value and % since. Mobile: the table scrolls inside the box.
 */

const PAGE = 15;

type SortKey = "txnDate" | "filingDate" | "usd" | "pctSince";

function HistoryBody() {
  return (
    <>
      <p>
        How it&apos;s built: the same nightly SEC Form 4 scan as Insider Buying, kept for 90 days. Every
        open-market purchase (code P) by an insider of a stock in our universe, worth $25k or more per
        insider buy, is listed here, not only the stocks that pass the 30-day cluster rule. Option
        exercises, awards, gifts and pre-planned 10b5-1 trades are left out.
      </p>
      <p>
        Price at buy is the insider&apos;s average price from the filing. Last close and % since come from
        our own nightly closes and refresh after each US session. Where the filing is in a different
        share class from the US listing we chart (for example ordinary shares versus the ADR), we use the
        close on the trade date instead, marked †.
      </p>
      <p className="text-xs text-slate-400">
        Education only. Past insider buys don&apos;t predict returns, and % since is not a track record.
      </p>
    </>
  );
}

function HistoryTitle({ children }: { children: ReactNode }) {
  return (
    <HowItWorksTitle
      heading="How Past insider buys works"
      subheading="SEC Form 4 · last 90 days · education only"
      body={<HistoryBody />}
    >
      {children}
    </HowItWorksTitle>
  );
}

function pct(n: number | null): ReactNode {
  if (n == null) return <span className="text-slate-500">—</span>;
  const cls = n > 0 ? "text-emerald-400" : n < 0 ? "text-rose-400" : "text-slate-300";
  return <span className={`font-semibold ${cls}`}>{`${n > 0 ? "+" : ""}${n.toFixed(1)}%`}</span>;
}

export function InsiderHistory({
  rows,
  asOf,
  windowStart,
}: {
  rows: InsiderHistoryRow[];
  asOf: string | null;
  windowStart: string | null;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "txnDate", dir: -1 });
  const [shown, setShown] = useState(PAGE);

  const sorted = useMemo(() => {
    const val = (r: InsiderHistoryRow): number | string | null => r[sort.key];
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // blanks always last
      if (vb == null) return -1;
      if (va !== vb) return (va < vb ? -1 : 1) * sort.dir;
      return b.usd - a.usd;
    });
  }, [rows, sort]);

  const setKey = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
    setShown(PAGE);
  };

  const th = "whitespace-nowrap px-1 py-1.5 font-medium";
  const td = "whitespace-nowrap px-1 py-1.5";
  const tdWrap = "min-w-[6rem] px-1 py-1.5 leading-snug";

  const SortTh = ({ k, children, right }: { k: SortKey; children: ReactNode; right?: boolean }) => {
    const active = sort.key === k;
    return (
      <th className={`${th} ${right ? "text-right" : ""}`} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => setKey(k)}
          className={`inline-flex items-center gap-0.5 uppercase tracking-wide hover:text-slate-200 ${active ? "text-canary-gold" : ""}`}
          title="Sort"
        >
          {children}
          <span aria-hidden className="text-[9px]">{active ? (sort.dir === -1 ? "▼" : "▲") : "↕"}</span>
        </button>
      </th>
    );
  };

  const visible = sorted.slice(0, shown);

  return (
    <article
      id="insider-history"
      className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-3 shadow-sm"
    >
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HistoryTitle>Past insider buys (3 months)</HistoryTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {rows.length} buys{windowStart ? ` · ${dmy(windowStart)}` : ""}
          {asOf ? ` to ${dmy(asOf)}` : ""} · ≥ $25k per insider · open market
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">No qualifying insider buys in the last 3 months.</p>
      ) : (
        <>
          <div className="mt-2 min-w-0 overflow-x-auto rounded-md border border-white/5">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-950/95 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={th}>Ticker</th>
                  <th className={th}>Insider</th>
                  <th className={th}>Role</th>
                  <SortTh k="txnDate">Trade date</SortTh>
                  <SortTh k="filingDate">Filed</SortTh>
                  <th className={`${th} text-right`}>Shares</th>
                  <th className={`${th} text-right !whitespace-normal leading-tight`}>Avg price</th>
                  <SortTh k="usd" right>
                    Value (US$)
                  </SortTh>
                  <th className={`${th} text-right !whitespace-normal leading-tight`}>Price at buy</th>
                  <th className={`${th} text-right !whitespace-normal leading-tight`}>Last close</th>
                  <SortTh k="pctSince" right>
                    % since
                  </SortTh>
                  <th className={th}>SEC</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={`${r.ticker}-${r.name}-${r.txnDate}-${i}`} className="border-t border-white/5 bg-slate-950/30 hover:bg-slate-900/80">
                    <td className={td}>
                      <span className="inline-flex items-center gap-1">
                        <TickerLink ticker={r.ticker} />
                      </span>
                    </td>
                    <td className={`${tdWrap} text-slate-200`}>{niceName(r.name)}</td>
                    <td className={`${tdWrap} min-w-[4.5rem] text-slate-400`}>{r.roles.join(", ")}</td>
                    <td className={`${td} tabular-nums text-slate-300`}>{dmy(r.txnDate)}</td>
                    <td className={`${td} tabular-nums text-slate-400`}>{dmy(r.filingDate)}</td>
                    <td className={`${td} text-right tabular-nums text-slate-300`}>{r.shares ? r.shares.toLocaleString("en-US") : "—"}</td>
                    <td className={`${td} text-right tabular-nums text-slate-300`}>{r.avgPrice ? money(r.avgPrice) : "—"}</td>
                    <td className={`${td} text-right tabular-nums font-semibold text-white`} title={money(r.usd)}>
                      {usd(r.usd)}
                    </td>
                    <td
                      className={`${td} text-right tabular-nums text-slate-300`}
                      title={
                        r.priceBasis === "close"
                          ? `Filing is in another share class; close on ${dmy(r.txnDate)} used`
                          : "Insider's average price"
                      }
                    >
                      {r.priceAtBuy != null ? money(r.priceAtBuy) : "—"}
                      {r.priceBasis === "close" ? <span className="ml-0.5 text-slate-500">†</span> : null}
                    </td>
                    <td className={`${td} text-right tabular-nums text-slate-300`} title={r.lastCloseDate ? `Close ${dmy(r.lastCloseDate)}` : undefined}>
                      {r.lastClose != null ? money(r.lastClose) : "—"}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{pct(r.pctSince)}</td>
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
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>
              Showing {visible.length} of {sorted.length}
              {rows.some((r) => r.priceBasis === "close") ? " · † price at buy = close on trade date (other share class)" : ""}
            </span>
            {shown < sorted.length ? (
              <span className="flex gap-3">
                <button type="button" onClick={() => setShown((n) => n + PAGE)} className="font-semibold text-sky-300 hover:underline">
                  Show more
                </button>
                <button type="button" onClick={() => setShown(sorted.length)} className="text-slate-400 hover:underline">
                  Show all
                </button>
              </span>
            ) : sorted.length > PAGE ? (
              <button type="button" onClick={() => setShown(PAGE)} className="text-slate-400 hover:underline">
                Show less
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Education only · past insider buys don&apos;t predict returns.</p>
        </>
      )}
    </article>
  );
}
