"use client";

/**
 * "Growth Score ranking" box (owner approved 2026-10-10, preview v2; flag MEMBERS_GROWTH_SCORE).
 * Stocks tab, full width, directly under the Main Scanner (Bullish / Bearish Setups).
 * Collapsed by default (open state in localStorage). Top 15 + Show more; default columns Stock · Growth · Danger · Rev growth; Columns ▾ adds GM trend,
 * EV/Sales vs peers, Runway, Path to profit (localStorage). Score cell opens the breakdown card.
 * Data: data/growth-score.json (scripts/build-fundamentals.mjs). Education only.
 */
import { useEffect, useMemo, useState } from "react";
import type { GrowthRankRow } from "@/lib/loadGrowthScore";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";
import { TickerLink } from "@/components/TickerChartLightbox";
import { ColumnsMenu, DangerBadge, GrowthCell, fmtPct, fmtPp, fmtRun, useColumnPrefs, type ColumnOption } from "@/components/GrowthScore";

type Key = "t" | "gs" | "d" | "rg" | "gmd" | "rel" | "run" | "path";
type Dir = "descending" | "ascending";
const COLS: { key: Key; label: string; menu?: string; tip: string; left?: boolean; locked?: boolean }[] = [
  { key: "t", label: "Stock", left: true, locked: true, tip: "Ticker. Tap it for the chart; ☆ adds it to My Stocks." },
  { key: "gs", label: "Canary Score", menu: "Canary Score", left: true, locked: true, tip: "Canary Score 0–100 vs our stock list. Hover or tap for the breakdown." },
  { key: "d", label: "Danger", left: true, tip: "High cash burn plus falling margins or a weak retention proxy. Reasons in the score card." },
  { key: "rg", label: "Rev growth", menu: "Revenue growth", tip: "Revenue over the last 12 months vs the 12 months before." },
  { key: "gmd", label: "GM trend", menu: "Gross-margin trend", tip: "Gross-margin change vs a year ago (percentage points)." },
  { key: "rel", label: "EV/S vs peers", menu: "EV/Sales vs peers", tip: "EV/Sales ÷ the industry (SIC) median. Below 1× = cheaper than peers." },
  { key: "run", label: "Runway", menu: "Cash runway", tip: "Months of cash at the current free-cash-flow burn; cash+ = cash-generative." },
  { key: "path", label: "Path to profit", tip: "Operating margin over 12 months; ▲/▼ = better/worse than a year ago." },
];
const DEFAULT: Key[] = ["t", "gs", "d", "rg"];
const OPTIONS: ColumnOption[] = COLS.map((c) => ({ key: c.key, label: c.menu ?? c.label, group: c.locked ? undefined : "Canary Score", locked: c.locked }));
const TOP = 15;
const OPEN_KEY = "canary.growthRank.open.v1";

const val = (r: GrowthRankRow, k: Key): number | string | null => {
  switch (k) {
    case "t":
      return r.t;
    case "gs":
      return r.gs;
    case "d":
      return r.d ? 1 : 0;
    case "rg":
      return r.rg ?? null;
    case "gmd":
      return r.gmd ?? null;
    case "rel":
      return r.rel ?? null;
    case "run":
      return r.run == null ? null : r.run === "cash+" ? 1e9 : r.run;
    case "path":
      return r.s?.path ?? null;
  }
};

function Explainer() {
  return (
    <>
      <p>
        Canary Score is a 0–100 score that ranks each stock against the rest of our stock list (100 = best), using
        figures from SEC filings over the last 12 months. The parts and their weights:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Revenue growth, 40%</b>: sales over the last 12 months vs a year ago, blended with the latest quarter vs
          the same quarter last year.
        </li>
        <li>
          <b>Gross-margin trend, 20%</b>: change in gross margin vs a year ago.
        </li>
        <li>
          <b>EV/Sales vs peers, 20%</b>: company value ÷ sales compared with the median of companies in the same
          industry. Cheaper than peers scores higher.
        </li>
        <li>
          <b>Cash runway 10% + path to profit 10%</b>: months of cash at the current burn (cash-generative = full
          marks), and the operating margin and its change vs a year ago.
        </li>
      </ul>
      <p>
        If a part is missing (banks, insurers, missing data), the other weights are scaled up and the card says so.
        Stocks with under 60% of the weight available are left out of the ranking.
      </p>
      <p>
        <b className="text-rose-300">Danger</b> means high cash burn (free cash flow below −15% of sales, or under 18
        months of cash) together with falling gross or operating margins, or a weak retention proxy: backlog or
        deferred revenue growing well slower than sales, or sales slowing sharply. Customer retention itself isn&apos;t
        in SEC data, so these stand in for it.
      </p>
      <p className="text-xs text-slate-400">
        A score describes reported numbers; it isn&apos;t a forecast. Education only, not buy or sell advice.
      </p>
    </>
  );
}

export function GrowthScoreRanking({ rows, asOf }: { rows: GrowthRankRow[]; asOf: string | null }) {
  const { vis, set, reset } = useColumnPrefs("canary.growthRankCols.v1", COLS.map((c) => c.key), DEFAULT, ["t", "gs"]);
  const cols = COLS.filter((c) => vis.includes(c.key));
  const [sort, setSort] = useState<{ key: Key | null; dir: Dir | null }>({ key: null, dir: null });
  const [all, setAll] = useState(false);
  // Owner 2026-10-10: collapsed by default; expanding is remembered on this device.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? "0" : "1");
      } catch {}
      return !o;
    });
  const ranked = useMemo(() => rows.map((r, i) => ({ r, i })), [rows]);
  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return ranked;
    const k = sort.key, s = sort.dir === "descending" ? -1 : 1;
    return ranked.slice().sort((a, b) => {
      const x = val(a.r, k), y = val(b.r, k);
      if (x == null && y == null) return a.i - b.i;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === "string" || typeof y === "string") {
        const c = String(x).localeCompare(String(y));
        return (sort.dir === "descending" ? c : -c) || a.i - b.i;
      }
      return s * (x - y) || a.i - b.i;
    });
  }, [ranked, sort]);
  const shown = all ? sorted : sorted.slice(0, TOP);
  const onSort = (key: Key) =>
    setSort((cur) => (cur.key !== key ? { key, dir: "descending" } : cur.dir === "descending" ? { key, dir: "ascending" } : { key: null, dir: null }));
  const cell = "border-y border-canary-gold/15 bg-slate-950/70 px-3 py-[5px] leading-[16px]";
  const last = cols[cols.length - 1]?.key;
  // Polish 2026-10-10 (matches Setups): columns hug their content; Score (the bar) takes the spare width.
  const size = (k: Key) => (k === "gs" ? "" : " w-px whitespace-nowrap");
  const edge = (k: Key) => size(k) + (k === "t" ? " rounded-l-md border-l pl-2.5" : "") + (k === last ? " rounded-r-md border-r pr-3" : "");
  const dash = (k: Key) => (
    <td key={k} className={`${cell}${edge(k)} text-right text-slate-500`}>
      —
    </td>
  );
  const asOfS = asOf && asOf.length >= 10 ? `${asOf.slice(8, 10)}/${asOf.slice(5, 7)}/${asOf.slice(0, 4)}` : "";

  return (
    <article id="growth-score-ranking" className="flex min-w-0 flex-col rounded-xl border border-canary-gold/40 bg-slate-900/70 p-3 shadow-sm ring-1 ring-canary-gold/20">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle heading="How Canary Score works" subheading="Revenue growth 40 · margin trend 20 · EV/Sales vs peers 20 · runway + profit 20 · education only" body={<Explainer />}>
            Canary Score ranking
          </HowItWorksTitle>
        </h3>
        <div className="flex min-w-0 items-center gap-2">
          {open ? <ColumnsMenu options={OPTIONS} visible={vis} onChange={set} onReset={reset} /> : null}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="growth-score-ranking-body"
            className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] uppercase tracking-wide text-canary-gold/80 transition hover:text-canary-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-canary-gold/60"
          >
            <span className="truncate">
              {rows.length} stocks{asOfS ? ` · Updated: ${asOfS}` : ""}
              {open ? "" : " · tap to expand"}
            </span>
            <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {open ? (
      <div id="growth-score-ranking-body" className="flex min-w-0 flex-col">
      <div className={`mt-2 w-0 min-w-full overflow-auto overscroll-x-contain ${all ? "max-h-[70vh]" : ""}`} tabIndex={0} aria-label="Canary Score ranking table">
        <table className="w-full border-separate border-spacing-y-[3px] text-[11.5px] tabular-nums">
          <thead>
            <tr>
              {cols.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active && sort.dir ? sort.dir : "none"}
                    title={`${c.tip} Education only.`}
                    className={`sticky top-0 z-10 whitespace-nowrap border-b border-canary-gold/25 bg-slate-900 px-3 pb-1.5 pt-1 align-bottom font-semibold ${c.left ? "text-left" : "text-right"}${size(c.key)}${c.key === "t" ? " pl-2.5" : ""}${c.key === last ? " pr-3" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className={`inline-flex items-center gap-[3px] text-[10px] uppercase leading-none tracking-wide transition hover:text-canary-gold ${c.left ? "" : "flex-row-reverse"} ${active ? "text-canary-gold" : "text-slate-400"}`}
                      aria-label={`Sort by ${c.menu ?? c.label}`}
                    >
                      {c.label}
                      <span aria-hidden className={`w-[7px] text-center text-[9px] ${active ? "text-canary-gold" : "text-slate-600"}`}>
                        {active ? (sort.dir === "descending" ? "▼" : "▲") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map(({ r, i }) => (
              <tr key={r.t}>
                {cols.map((c) => {
                  const k = c.key;
                  if (k === "t")
                    return (
                      <td key={k} className={`${cell}${edge(k)} text-left`}>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-5 text-right text-[10px] text-slate-500">{i + 1}</span>
                          <TickerLink ticker={r.t} className="shrink-0 text-left font-semibold tracking-wide text-white" />
                        </span>
                      </td>
                    );
                  if (k === "gs")
                    return (
                      <td key={k} className={`${cell}${edge(k)} text-left`}>
                        <GrowthCell ticker={r.t} row={r} scored={rows.length} variant="row" barClass="h-[6px] w-24 sm:w-44" showDanger={!vis.includes("d")} />
                      </td>
                    );
                  if (k === "d")
                    return (
                      <td key={k} className={`${cell}${edge(k)} text-left`}>
                        {r.d ? <DangerBadge /> : null}
                      </td>
                    );
                  if (k === "rg")
                    return r.rg == null ? dash(k) : (
                      <td key={k} className={`${cell}${edge(k)} text-right ${r.rg < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                        {fmtPct(r.rg)}
                      </td>
                    );
                  if (k === "gmd")
                    return r.gmd == null ? dash(k) : (
                      <td key={k} className={`${cell}${edge(k)} text-right ${r.gmd < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                        {fmtPp(r.gmd)}
                      </td>
                    );
                  if (k === "rel")
                    return r.rel == null ? dash(k) : (
                      <td key={k} className={`${cell}${edge(k)} text-right text-slate-200`} title={r.evs != null && r.pm != null ? `EV/Sales ${r.evs.toFixed(1)}× vs ${r.pm.toFixed(1)}× peer median (${r.pg})` : undefined}>
                        {r.rel.toFixed(2)}×
                      </td>
                    );
                  if (k === "run")
                    return r.run == null ? dash(k) : (
                      <td key={k} className={`${cell}${edge(k)} text-right ${r.run === "cash+" ? "text-emerald-300" : r.run < 18 ? "text-rose-300" : "text-slate-200"}`}>
                        {fmtRun(r.run)}
                      </td>
                    );
                  return r.om == null ? dash(k) : (
                    <td key={k} className={`${cell}${edge(k)} text-right ${r.om < 0 ? "text-rose-300" : "text-slate-200"}`}>
                      {fmtPct(r.om)}
                      {r.omd != null ? <span className={r.omd >= 0 ? "text-emerald-300" : "text-rose-300"}>{r.omd >= 0 ? " ▲" : " ▼"}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > TOP ? (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 self-start rounded-md border border-canary-gold/35 px-2 py-1 text-[11px] text-slate-300 hover:border-canary-gold/70 hover:text-canary-gold">
          {all ? `Show top ${TOP}` : `Show more (all ${rows.length})`}
        </button>
      ) : null}
      <p className="mt-1.5 text-[10px] leading-snug text-slate-500">Tap a Growth score for the breakdown · n/m = not meaningful · Education only</p>
      </div>
      ) : null}
    </article>
  );
}
