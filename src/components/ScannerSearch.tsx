"use client";

import { useMemo, useState } from "react";
import { TickerLink } from "@/components/TickerChartLightbox";
import { searchScannerMembership, type ScannerGroupInput, type ScannerRow } from "@/lib/scannerSearch";

/** Current scanner membership only. History stays in the separate recent-marks search. */
export function ScannerSearch({
  groups,
  universe,
}: {
  groups: ScannerGroupInput[];
  universe: ScannerRow[];
}) {
  const [q, setQ] = useState("");
  const result = useMemo(() => searchScannerMembership(groups, universe, q), [groups, universe, q]);
  const tickerCount = result.hits.length;
  const rowCount = result.groupCounts.reduce((n, g) => n + g.count, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-0 flex-1 text-[11px] font-medium text-slate-400" htmlFor="search-scanners">
          Search scanners
          <input
            id="search-scanners"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ticker or company in today's scanners"
            className="mt-1 w-full rounded-md border border-white/10 bg-slate-950 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-400/50 focus:outline-none"
          />
        </label>
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">Today's scanner rows only. Past marks are in Search recent marks.</p>
      <div aria-live="polite" className="mt-2 text-xs text-slate-300">
        {!result.query ? null : tickerCount ? (
          <>
            <p>
              {tickerCount} {tickerCount === 1 ? "ticker" : "tickers"} · {rowCount}{" "}
              {rowCount === 1 ? "scanner row" : "scanner rows"}
              {result.groupCounts.map((g) => ` · ${g.label} ${g.count}`).join("")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {result.hits.map((hit) => (
                <li key={hit.ticker} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <TickerLink ticker={hit.ticker} className="font-semibold text-white" />
                  {hit.name ? <span className="text-slate-400">{hit.name}</span> : null}
                  <span className="text-[11px] text-slate-500">{hit.groups.map((g) => g.label).join(", ")}</span>
                </li>
              ))}
            </ul>
          </>
        ) : result.outsideCuratedList ? (
          <p>Outside the curated stock list. This search does not look up other symbols.</p>
        ) : (
          <p>
            No match in the current scanners.
            {result.curatedOnly.length
              ? ` On the curated list: ${result.curatedOnly.map((r) => r.ticker).join(", ")}.`
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
