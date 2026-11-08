"use client";

/**
 * Filterable / sortable stock table inside the Ticker Universe lightbox (owner t1010u).
 * Reuses the Canary Score ranking patterns (ColumnsMenu, useColumnPrefs, GrowthCell, TickerLink ☆).
 * Data is server-built (lib/tickerUniverse.loadUniverseStockRows). Education only, not advice.
 */
import { useMemo, useState } from "react";
import type { UniverseStockRow } from "@/lib/tickerUniverse";
import { TickerLink } from "@/components/TickerChartLightbox";
import { ColumnsMenu, DangerBadge, GrowthCell, fmtPct, fmtPp, fmtRun, useColumnPrefs, type ColumnOption } from "@/components/GrowthScore";

type Key = "t" | "gs" | "d" | "rg" | "eg" | "eq" | "pe" | "tm" | "gmd" | "rel" | "run" | "path";
type Dir = "descending" | "ascending";
const COLS: { key: Key; label: string; menu?: string; tip: string; left?: boolean; locked?: boolean }[] = [
  { key: "t", label: "Stock", left: true, locked: true, tip: "Ticker. Tap it for the chart; ☆ adds it to My Stocks." },
  { key: "gs", label: "Canary Score", left: true, locked: true, tip: "Canary Score 0–100 vs our stock list. Hover or tap for the breakdown." },
  { key: "d", label: "Danger", left: true, tip: "High cash burn plus falling margins or a weak retention proxy." },
  { key: "rg", label: "Rev growth", menu: "Revenue growth", tip: "Revenue over the last 12 months vs the 12 months before." },
  { key: "eg", label: "EPS y/y", menu: "EPS growth y/y", tip: "Trailing-12-month diluted EPS vs a year earlier (SEC filings). n/m when either is negative." },
  { key: "eq", label: "EPS q/q", menu: "EPS growth q/q", tip: "Latest quarter's diluted EPS vs the quarter before (SEC filings; fiscal Q4 = full year minus 9 months). Seasonal businesses swing." },
  { key: "pe", label: "P/E", tip: "Last close ÷ trailing-12-month diluted EPS." },
  { key: "tm", label: "Avg target", menu: "Analyst avg target", tip: "Average analyst price target (Yahoo Finance), shown only when more than 5 analysts cover the stock. Analyst opinions, not ours; often wrong." },
  { key: "gmd", label: "GM trend", menu: "Gross-margin trend", tip: "Gross-margin change vs a year ago (percentage points)." },
  { key: "rel", label: "EV/S vs peers", menu: "EV/Sales vs peers", tip: "EV/Sales ÷ the industry median. Below 1× = cheaper than peers." },
  { key: "run", label: "Runway", menu: "Cash runway", tip: "Months of cash at the current burn; cash+ = cash-generative." },
  { key: "path", label: "Path to profit", tip: "Operating margin over 12 months; ▲/▼ = better/worse than a year ago." },
];
const DEFAULT: Key[] = ["t", "gs", "d", "rg", "eg", "eq", "tm"];
const OPTIONS: ColumnOption[] = COLS.map((c) => ({ key: c.key, label: c.menu ?? c.label, locked: c.locked }));
const BANDS = [
  { id: "all", label: "All" },
  { id: "80", label: "80+" },
  { id: "60", label: "60–79" },
  { id: "40", label: "40–59" },
  { id: "0", label: "<40" },
  { id: "none", label: "Unscored" },
] as const;
type Band = (typeof BANDS)[number]["id"];

const val = (r: UniverseStockRow, k: Key): number | string | null => {
  switch (k) {
    case "t": return r.t;
    case "gs": return r.gs;
    case "d": return r.d ? 1 : 0;
    case "rg": return r.rg ?? null;
    case "eg": return r.eg ?? null;
    case "eq": return r.eq ?? null;
    case "pe": return r.pe ?? null;
    case "tm": return r.tu ?? null;
    case "gmd": return r.gmd ?? null;
    case "rel": return r.rel ?? null;
    case "run": return r.run == null ? null : r.run === "cash+" ? 1e9 : r.run;
    case "path": return r.om ?? null;
  }
};
const inBand = (gs: number | null, b: Band) =>
  b === "all" ? true : b === "none" ? gs == null : gs == null ? false : b === "80" ? gs >= 80 : b === "60" ? gs >= 60 && gs < 80 : b === "40" ? gs >= 40 && gs < 60 : gs < 40;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${on ? "border-canary-gold/70 bg-canary-gold/15 text-canary-gold" : "border-white/15 text-slate-300 hover:border-canary-gold/50"}`}>
      {children}
    </button>
  );
}

export function UniverseStockTable({ rows, query }: { rows: UniverseStockRow[]; query: string }) {
  const { vis, set, reset } = useColumnPrefs("canary.universeCols.v1", COLS.map((c) => c.key), DEFAULT, ["t", "gs"]);
  const cols = COLS.filter((c) => vis.includes(c.key));
  const [sort, setSort] = useState<{ key: Key | null; dir: Dir | null }>({ key: "gs", dir: "descending" });
  const [band, setBand] = useState<Band>("all");
  const [danger, setDanger] = useState<"any" | "only" | "hide">("any");
  const [profit, setProfit] = useState(false);
  const scored = useMemo(() => rows.filter((r) => r.gs != null).length, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        (!q || r.t.includes(q) || (r.name ?? "").toUpperCase().includes(q)) &&
        inBand(r.gs, band) &&
        (danger === "any" || (danger === "only" ? !!r.d : !r.d)) &&
        (!profit || (r.om != null && r.om > 0)));
  }, [rows, query, band, danger, profit]);
  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return filtered;
    const k = sort.key, s = sort.dir === "descending" ? -1 : 1;
    return filtered.slice().sort((a, b) => {
      const x = val(a.r, k), y = val(b.r, k);
      if (x == null && y == null) return a.i - b.i;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === "string" || typeof y === "string") return (sort.dir === "descending" ? 1 : -1) * String(x).localeCompare(String(y)) || a.i - b.i;
      return s * (x - y) || a.i - b.i;
    });
  }, [filtered, sort]);
  const onSort = (key: Key) =>
    setSort((cur) => (cur.key !== key ? { key, dir: key === "t" ? "ascending" : "descending" } : cur.dir === "descending" ? { key, dir: "ascending" } : { key: null, dir: null }));

  const cell = "border-y border-canary-gold/15 bg-slate-950/70 px-3 py-[5px] leading-[16px]";
  const last = cols[cols.length - 1]?.key;
  const size = (k: Key) => (k === "gs" ? "" : " w-px whitespace-nowrap");
  const edge = (k: Key) => size(k) + (k === "t" ? " rounded-l-md border-l pl-2.5" : "") + (k === last ? " rounded-r-md border-r pr-3" : "");
  const dash = (k: Key, title?: string) => <td key={k} title={title} className={`${cell}${edge(k)} text-right text-slate-500`}>—</td>;
  const pct = (k: Key, v: number | null | undefined) =>
    v == null ? dash(k) : <td key={k} className={`${cell}${edge(k)} text-right ${v < 0 ? "text-rose-300" : "text-emerald-300"}`}>{fmtPct(v)}</td>;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filters">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Score</span>
        {BANDS.map((b) => <Chip key={b.id} on={band === b.id} onClick={() => setBand(b.id)}>{b.label}</Chip>)}
        <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500">Danger</span>
        <Chip on={danger === "only"} onClick={() => setDanger((d) => (d === "only" ? "any" : "only"))}>Only</Chip>
        <Chip on={danger === "hide"} onClick={() => setDanger((d) => (d === "hide" ? "any" : "hide"))}>Hide</Chip>
        <Chip on={profit} onClick={() => setProfit((p) => !p)}>Profitable</Chip>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{sorted.length} / {rows.length}</span>
          <ColumnsMenu options={OPTIONS} visible={vis} onChange={set} onReset={reset} />
        </span>
      </div>
      <div className="mt-2 w-0 min-w-full overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Stocks table">
        <table className="w-full border-separate border-spacing-y-[3px] text-[11.5px] tabular-nums">
          <thead>
            <tr>
              {cols.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active && sort.dir ? sort.dir : "none"} title={`${c.tip} Education only.`}
                    className={`sticky top-0 z-10 whitespace-nowrap border-b border-canary-gold/25 bg-slate-950 px-3 pb-1.5 pt-1 align-bottom font-semibold ${c.left ? "text-left" : "text-right"}${size(c.key)}`}>
                    <button type="button" onClick={() => onSort(c.key)} aria-label={`Sort by ${c.menu ?? c.label}`}
                      className={`inline-flex items-center gap-[3px] text-[10px] uppercase leading-none tracking-wide transition hover:text-canary-gold ${c.left ? "" : "flex-row-reverse"} ${active ? "text-canary-gold" : "text-slate-400"}`}>
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
            {sorted.map(({ r }) => (
              <tr key={r.t}>
                {cols.map(({ key: k }) => {
                  if (k === "t")
                    return (
                      <td key={k} className={`${cell}${edge(k)} text-left`} title={r.name}>
                        <TickerLink ticker={r.t} />
                      </td>
                    );
                  if (k === "gs")
                    return r.gs == null ? (
                      <td key={k} className={`${cell}${edge(k)} text-left text-slate-500`} title={r.why}>not scored</td>
                    ) : (
                      <td key={k} className={`${cell}${edge(k)} text-left`}>
                        <GrowthCell ticker={r.t} row={r} scored={scored} variant="row" barClass="h-[6px] w-20 sm:w-32" showDanger={!vis.includes("d")} />
                      </td>
                    );
                  if (k === "d") return <td key={k} className={`${cell}${edge(k)} text-left`}>{r.d ? <DangerBadge /> : null}</td>;
                  if (k === "rg") return pct(k, r.rg);
                  if (k === "eg") return pct(k, r.eg);
                  if (k === "eq") return pct(k, r.eq);
                  if (k === "pe") return r.pe == null ? dash(k) : <td key={k} className={`${cell}${edge(k)} text-right text-slate-200`}>{r.pe.toFixed(1)}</td>;
                  if (k === "tm")
                    return r.tm == null ? dash(k, "Fewer than 6 analysts, or no data") : (
                      <td key={k} className={`${cell}${edge(k)} text-right text-slate-200`} title={`Average of ${r.ao} analyst targets (Yahoo Finance). Analyst opinions, not ours. Education only.`}>
                        {r.tm.toFixed(2)}
                        {r.tu != null ? <span className="text-slate-400"> ({r.tu >= 0 ? "+" : ""}{(r.tu * 100).toFixed(0)}%)</span> : null}
                      </td>
                    );
                  if (k === "gmd")
                    return r.gmd == null ? dash(k) : <td key={k} className={`${cell}${edge(k)} text-right ${r.gmd < 0 ? "text-rose-300" : "text-emerald-300"}`}>{fmtPp(r.gmd)}</td>;
                  if (k === "rel") return r.rel == null ? dash(k) : <td key={k} className={`${cell}${edge(k)} text-right text-slate-200`}>{r.rel.toFixed(2)}×</td>;
                  if (k === "run")
                    return r.run == null ? dash(k) : (
                      <td key={k} className={`${cell}${edge(k)} text-right ${r.run === "cash+" ? "text-emerald-300" : r.run < 18 ? "text-rose-300" : "text-slate-200"}`}>{fmtRun(r.run)}</td>
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
            {!sorted.length ? (
              <tr><td colSpan={cols.length} className="py-4 text-center text-xs text-slate-400">No stocks match. If you can&apos;t find a stock, it may not have made our list (see above).</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
        Tap a score for the breakdown · EPS from SEC filings · Avg target = analysts&apos; average (Yahoo Finance), only with more than 5 analysts; not our view · n/m = not meaningful · Education only, not buy or sell advice
      </p>
    </div>
  );
}
