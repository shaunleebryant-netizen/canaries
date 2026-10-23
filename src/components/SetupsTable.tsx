"use client";

/**
 * Bullish / Bearish Setups as a sortable table (owner approved 2026-10-10; flag MEMBERS_SETUPS_COLUMNS).
 * Columns: Stock · Score · [Growth] · Emojis · Since · Price · P/E · EPS g y/y · EV/EBITDA
 *          [+ hidden Growth Score columns: Rev g · GM trend · EV/S vs peers · Runway · Path to profit].
 * Growth Score (owner approved 2026-10-10, flag MEMBERS_GROWTH_SCORE): Growth column right after Score with a
 * hover / tap breakdown card, and a "Columns ▾" menu per box (localStorage; Stock and Growth always shown;
 * EPS g hidden by default so the default set fits the half-width box on desktop).
 * Header click: high→low, then low→high, then back to the current ranking. n/m and — always sort last.
 * Fundamentals: data/fundamentals.json; Growth Score: data/growth-score.json (SEC EDGAR, as filed). Education only.
 * Phones: the table scrolls sideways inside the box; the page never widens.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { SetupCondition } from "@/lib/setupsCore.mjs";
import type { FundRow, FundWhy } from "@/lib/loadFundamentals";
import type { GrowthRow } from "@/lib/loadGrowthScore";
import { CONDITION_META } from "@/components/MainScannerSetups";
import { TickerLink } from "@/components/TickerChartLightbox";
import { ColumnsMenu, GrowthCell, fmtPp, fmtRun, useColumnPrefs, type ColumnOption } from "@/components/GrowthScore";

export interface SetupsTableRow {
  ticker: string;
  count: number;
  added: string;
  conditions: SetupCondition[];
}

type Dir = "descending" | "ascending";
type ColKey = "t" | "gs" | "emo" | "since" | "price" | "pe" | "g" | "ev" | "rg" | "gmd" | "rel" | "run" | "path";

interface Col {
  key: ColKey;
  label: string;
  tip: string;
  /** Optional second header line so long labels stack and the table fits a half-width box. */
  label2?: string;
  /** Name in the Columns menu. */
  menu?: string;
  group?: string;
  left?: boolean;
  text?: boolean;
  locked?: boolean;
  growth?: boolean;
}

const COLS: Col[] = [
  { key: "t", label: "Stock", left: true, text: true, locked: true, tip: "Ticker. Tap it for the chart; ☆ adds it to My Stocks. Education only." },
  { key: "rg", label: "Rev", label2: "Growth", menu: "Rev Growth", group: "Canary Score", growth: true, tip: "Revenue over the last 12 months vs the 12 months before (SEC filings, as filed). Education only." },
  // Owner t698u 2026-10-14: "Growth" → "Canary Score", number only (no meter); tap still opens the breakdown.
  { key: "gs", label: "Canary", label2: "Score", menu: "Canary Score", locked: true, growth: true, tip: "Canary Growth Score 0–100 vs our stock list: revenue growth 40%, gross-margin trend 20%, EV/Sales vs peers 20%, cash runway 10%, path to profit 10%. Hover or tap a score for the breakdown; ! = Danger. Education only." },
  { key: "emo", label: "Emojis", left: true, group: "Setups", tip: "The signals behind each setup: 🐟 Fish, 😊 smiley, 💵 MFI washout, 🟢/🔴 weekly trend, 📈 monthly trend, IBD, 🥵 Sweaty, 💀 skull. Education only." },
  // Owner 2026-10-14: "Since" renamed "Alert"; order Stock · Rev Growth · Canary Score · Emojis · Alert.
  { key: "since", label: "Alert", menu: "Alert", text: true, group: "Setups", tip: "Alert date: when the stock joined this list (DD/MM). Education only." },
  // Owner 2026-10-10: Score (signal-count badge) column removed; rows still arrive in the ranked order.
  // Owner t698u 2026-10-14: Price column removed.
  { key: "pe", label: "P/E", group: "Valuation", tip: "Price ÷ diluted earnings per share over the last 12 months. n/m when earnings are negative. Education only." },
  { key: "g", label: "EPS g", label2: "y/y", menu: "EPS growth y/y", group: "Valuation", tip: "Change in 12-month diluted EPS vs the 12 months before. n/m when either is negative. Education only." },
  { key: "ev", label: "EV/", label2: "EBITDA", menu: "EV/EBITDA", group: "Valuation", tip: "Company value (incl. debt, minus cash) ÷ operating profit before depreciation and amortisation, last 12 months, as filed. n/m for losses, tiny margins, banks and insurers. Education only." },
  { key: "gmd", label: "GM", label2: "trend", menu: "Gross-margin trend", group: "Canary Score", growth: true, tip: "Gross-margin change vs a year ago, in percentage points. Education only." },
  { key: "rel", label: "EV/S", label2: "vs peers", menu: "EV/Sales vs peers", group: "Canary Score", growth: true, tip: "EV/Sales ÷ the industry (SIC) median. Below 1× = cheaper than peers. Education only." },
  { key: "run", label: "Runway", menu: "Cash runway", group: "Canary Score", growth: true, tip: "Months of cash at the current free-cash-flow burn; cash+ = cash-generative. Education only." },
  { key: "path", label: "Path to", label2: "profit", menu: "Path to profit", group: "Canary Score", growth: true, tip: "Operating margin over 12 months; ▲/▼ = better/worse than a year ago. Education only." },
];
const BASE_DEFAULT: ColKey[] = ["t", "emo", "since", "pe", "g", "ev"];
/** Owner 2026-10-10: Growth after Score; EPS g, P/E and EV/EBITDA hidden by default (Columns ▾ adds them). */
/** Owner 2026-10-14: Stock · Rev Growth · Canary Score · Emojis · Alert (Price removed). */
const GROWTH_DEFAULT: ColKey[] = ["t", "rg", "gs", "emo", "since"];

const ddmm = (ymd: string) => (ymd.length >= 10 ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}` : ymd);
const ddmmyyyy = (ymd: string) => (ymd.length >= 10 ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : ymd);
const fmtPrice = (v: number) => (v >= 1000 ? v.toFixed(0) : v.toFixed(2));
const fmtPe = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));
const fmtG = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`;
const fmtEv = (v: number) => `${v.toFixed(1)}×`;

function nullLabel(why: FundWhy | undefined): string {
  if (why === "nm") return "n/m";
  if (why === "na") return "n/a";
  return "—";
}
function nullTitle(why: FundWhy | undefined, metric: ColKey, f?: FundRow): string {
  if (why === "na") return "Not a company (ETF, crypto or metal): no earnings. Education only.";
  if (why === "nm")
    return metric === "ev" && f?.n?.includes("bank")
      ? "Bank, insurer or lender: EV/EBITDA is not meaningful."
      : "Not meaningful: negative earnings, a tiny margin or a multiple over 100×.";
  if (why === "stale") return "Latest SEC filing is too old to use.";
  return `Not available in SEC data${f?.n ? ` (${f.n})` : ""}.`;
}

function sortValue(r: SetupsTableRow, f: FundRow | undefined, g: GrowthRow | undefined, k: ColKey): number | string | null {
  switch (k) {
    case "t":
      return r.ticker;
    case "gs":
      return g?.gs ?? null;
    case "emo":
      return r.conditions.length;
    case "since":
      return r.added || null;
    case "price":
      return f?.p ?? null;
    case "pe":
      return f?.pe ?? null;
    case "g":
      return f?.g ?? null;
    case "ev":
      return f?.ev ?? null;
    case "rg":
      return g?.rg ?? null;
    case "gmd":
      return g?.gmd ?? null;
    case "rel":
      return g?.rel ?? null;
    case "run":
      return g?.run == null ? null : g.run === "cash+" ? 1e9 : g.run;
    case "path":
      return g?.s?.path ?? null;
  }
}

export function SetupsTable({
  rows,
  fundamentals,
  tone,
  growth,
  growthScored = 0,
  visible,
}: {
  rows: SetupsTableRow[];
  fundamentals: Record<string, FundRow>;
  tone: "bull" | "bear";
  /** Growth Score rows (flag MEMBERS_GROWTH_SCORE); omitted → no Growth columns. */
  growth?: Record<string, GrowthRow>;
  growthScored?: number;
  /** Visible column keys (Columns menu); omitted → the default set. */
  visible?: string[];
}) {
  const [sort, setSort] = useState<{ key: ColKey | null; dir: Dir | null }>({ key: null, dir: null });
  const cols = useMemo(() => {
    const want = visible ?? (growth ? GROWTH_DEFAULT : BASE_DEFAULT);
    return COLS.filter((c) => (growth || !c.growth) && (c.locked ? c.key !== "gs" || growth : true) && want.includes(c.key));
  }, [visible, growth]);

  const sorted = useMemo(() => {
    const ranked = rows.map((r, i) => ({ r, i }));
    if (!sort.key || !sort.dir) return ranked;
    const k = sort.key;
    const s = sort.dir === "descending" ? -1 : 1;
    return ranked.slice().sort((a, b) => {
      const x = sortValue(a.r, fundamentals[a.r.ticker], growth?.[a.r.ticker], k);
      const y = sortValue(b.r, fundamentals[b.r.ticker], growth?.[b.r.ticker], k);
      if (x == null && y == null) return a.i - b.i;
      if (x == null) return 1;
      if (y == null) return -1;
      if (k === "t") {
        // First click = A→Z.
        const c = String(x).localeCompare(String(y));
        return (sort.dir === "descending" ? c : -c) || a.i - b.i;
      }
      if (typeof x === "string" || typeof y === "string") return s * String(x).localeCompare(String(y)) || a.i - b.i;
      return s * (x - y) || a.i - b.i;
    });
  }, [rows, fundamentals, growth, sort]);

  const onSort = (key: ColKey) =>
    setSort((cur) =>
      cur.key !== key
        ? { key, dir: "descending" }
        : cur.dir === "descending"
          ? { key, dir: "ascending" }
          : { key: null, dir: null }
    );

  const rowBorder = tone === "bull" ? "border-emerald-500/25" : "border-rose-500/25";
  const cell = `border-y ${rowBorder} bg-slate-950/70 px-2 py-[5px] leading-[16px]`;
  const lastKey = cols[cols.length - 1]?.key;
  // Owner 2026-10-10 polish: every column hugs its content; the spare width goes to Emojis (or Stock if Emojis is off).
  // Extra columns switched on → tighter padding and stacked two-line headers (globals.css .setups-dense).
  const dense = cols.length > 5;
  const fillKey: ColKey = cols.some((c) => c.key === "emo") ? "emo" : "t";
  const size = (k: ColKey) => (k === fillKey ? "" : " w-px whitespace-nowrap");
  const edge = (k: ColKey) =>
    size(k) + (k === lastKey ? " rounded-r-md border-r pr-2.5" : "") + (k === "t" ? " rounded-l-md border-l pl-2.5" : "");

  const metric = (f: FundRow | undefined, key: "pe" | "g" | "ev") => {
    const end = edge(key);
    const v = f ? f[key] : null;
    const why = f ? (key === "pe" ? f.pw : key === "g" ? f.gw : f.evw) : "missing";
    if (v == null)
      return (
        <td key={key} className={`${cell}${end} text-right text-slate-500`} title={nullTitle(why, key, f)}>
          {nullLabel(why)}
        </td>
      );
    const txt = key === "pe" ? fmtPe(v) : key === "g" ? fmtG(v) : fmtEv(v);
    const colour = key === "g" ? (v < 0 ? "text-rose-300" : "text-emerald-300") : "text-slate-200";
    const title = [f?.n ?? "", f?.fe ? `latest period ${ddmmyyyy(f.fe)}` : ""].filter(Boolean).join(" · ");
    return (
      <td key={key} className={`${cell}${end} text-right ${colour}`} title={title || undefined}>
        {txt}
      </td>
    );
  };
  const dash = (key: ColKey, title?: string) => (
    <td key={key} className={`${cell}${edge(key)} text-right text-slate-500`} title={title}>
      —
    </td>
  );

  const renderCell = (c: Col, r: SetupsTableRow, f: FundRow | undefined, g: GrowthRow | undefined, cond: string) => {
    const k = c.key;
    switch (k) {
      case "t":
        return (
          <td key={k} className={`${cell}${edge(k)} text-left`}>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <TickerLink ticker={r.ticker} className="shrink-0 text-left font-semibold tracking-wide text-white" />
            </span>
          </td>
        );
      case "gs":
        return (
          <td key={k} className={`${cell}${edge(k)} whitespace-nowrap text-right`}>
            <GrowthCell ticker={r.ticker} row={g} scored={growthScored} variant="row" barClass="hidden" />
          </td>
        );
      case "emo":
        return (
          <td key={k} className={`${cell}${edge(k)} whitespace-nowrap text-left text-[11px]`} title={cond}>
            <span className="emo-row inline-flex items-center gap-[3px] align-middle" aria-hidden>
              {r.conditions.map((cd) => (
                <span key={cd.id} className="shrink-0 leading-none">
                  {CONDITION_META[cd.id]?.icon(cd) ?? cd.id}
                </span>
              ))}
            </span>
          </td>
        );
      case "since":
        return (
          <td key={k} className={`${cell}${edge(k)} whitespace-nowrap text-right text-slate-400`} title={ddmmyyyy(r.added)}>
            {ddmm(r.added)}
          </td>
        );
      case "price":
        return (
          <td key={k} className={`${cell}${edge(k)} text-right text-slate-200`}>
            {f?.p != null ? fmtPrice(f.p) : <span className="text-slate-500">—</span>}
          </td>
        );
      case "pe":
      case "g":
      case "ev":
        return metric(f, k);
      case "rg":
        return g?.rg == null ? dash(k, g?.why) : (
          <td
            key={k}
            className={`${cell}${edge(k)} text-right ${g.rg < 0 ? "text-rose-300" : "text-emerald-300"}`}
            title={g.tiny ? `${fmtG(g.rg)} · small base: revenue a year ago was very small, so the % looks large` : undefined}
          >
            {fmtG(g.rg)}
            {/* Owner t698u follow-up: same tiny-base flag (g.tiny) the breakdown card uses. */}
            {g.tiny ? (
              <sup className="ml-px cursor-help text-[8px] font-bold text-amber-300/90" aria-label="small base">
                SB
              </sup>
            ) : null}
          </td>
        );
      case "gmd":
        return g?.gmd == null ? dash(k) : (
          <td key={k} className={`${cell}${edge(k)} text-right ${g.gmd < 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {fmtPp(g.gmd)}
          </td>
        );
      case "rel":
        return g?.rel == null ? dash(k) : (
          <td key={k} className={`${cell}${edge(k)} text-right text-slate-200`} title={g.evs != null && g.pm != null ? `EV/Sales ${g.evs.toFixed(1)}× vs ${g.pm.toFixed(1)}× peer median` : undefined}>
            {g.rel.toFixed(2)}×
          </td>
        );
      case "run":
        return g?.run == null ? dash(k) : (
          <td key={k} className={`${cell}${edge(k)} text-right ${g.run === "cash+" ? "text-emerald-300" : g.run < 18 ? "text-rose-300" : "text-slate-200"}`}>
            {fmtRun(g.run)}
          </td>
        );
      case "path":
        return g?.om == null ? dash(k) : (
          <td key={k} className={`${cell}${edge(k)} text-right ${g.om < 0 ? "text-rose-300" : "text-slate-200"}`}>
            {fmtG(g.om)}
            {g.omd != null ? <span className={g.omd >= 0 ? "text-emerald-300" : "text-rose-300"}>{g.omd >= 0 ? " ▲" : " ▼"}</span> : null}
          </td>
        );
    }
  };

  return (
    <div className={`setups-table${dense ? " setups-dense" : ""} mt-2 min-h-0 w-0 min-w-full flex-1 overflow-auto overscroll-x-contain`} tabIndex={0} aria-label="Setups table, scrolls sideways on small screens">
      <table className="w-full border-separate border-spacing-y-[3px] text-[11px] tabular-nums">
        <thead>
          <tr>
            {cols.map((c, i) => {
              const active = sort.key === c.key;
              const ariaSort = active && sort.dir ? sort.dir : "none";
              const tipPos = i === 0 ? "left-0" : i === cols.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={`group sticky top-0 z-10 whitespace-nowrap border-b border-canary-gold/25 bg-slate-900 px-2 pb-1.5 pt-1 align-bottom font-semibold ${c.left ? "text-left" : "text-right"}${size(c.key)}${i === 0 ? " pl-2.5" : ""}${i === cols.length - 1 ? " pr-2.5" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(c.key)}
                    className={`inline-flex items-center gap-[3px] text-[10px] uppercase leading-none tracking-wide transition hover:text-canary-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-canary-gold/60 ${c.left ? "" : "flex-row-reverse"} ${active ? "text-canary-gold" : "text-slate-400"}`}
                    aria-label={`Sort by ${c.menu ?? c.label}`}
                  >
                    {c.label2 && dense ? (
                      <span className={`flex flex-col gap-px ${c.left ? "items-start" : "items-end"}`}>
                        <span>{c.label}</span>
                        <span>{c.label2}</span>
                      </span>
                    ) : (
                      <span>{c.label2 ? `${c.label}${c.label.endsWith("/") ? "" : " "}${c.label2}` : c.label}</span>
                    )}
                    <span aria-hidden className={`w-[7px] text-center text-[9px] ${active ? "text-canary-gold" : "text-slate-600"}`}>
                      {active ? (sort.dir === "descending" ? "▼" : "▲") : "↕"}
                    </span>
                  </button>
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute top-full z-20 mt-1 hidden w-max max-w-[220px] whitespace-normal rounded-md border border-canary-gold/45 bg-slate-900 px-2 py-1.5 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-slate-200 shadow-lg group-hover:block group-focus-within:block ${tipPos}`}
                  >
                    {c.tip}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ r }) => {
            const f = fundamentals[r.ticker];
            const g = growth?.[r.ticker];
            const cond = `${r.count} conditions: ${r.conditions.map((c) => CONDITION_META[c.id]?.label(c) ?? c.id).join(" · ")} · alert ${ddmmyyyy(r.added)}`;
            return <tr key={r.ticker}>{cols.map((c) => renderCell(c, r, f, g, cond))}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

/** One short footer line under each box (owner 2026-10-10: same wording across the Main Scanner boxes). */
export function SetupsTableLegend({ growth = false }: { growth?: boolean }) {
  return (
    <p className="mt-1.5 shrink-0 text-[10px] leading-snug text-slate-500">
      {growth ? "Tap a Canary Score for the breakdown · SB = small base · n/m = not meaningful · Education only" : "n/m = not meaningful · — = not in SEC data · Education only"}
    </p>
  );
}

const MENU_OPTIONS: ColumnOption[] = COLS.map((c) => ({ key: c.key, label: c.menu ?? c.label, group: c.group, locked: c.locked }));

/**
 * Box body for Bullish / Bearish Setups: header row (title · meta · Columns ▾), table or empty text, legend.
 * The Columns menu appears only with Growth Score data (MEMBERS_GROWTH_SCORE).
 */
export function SetupsPanel({
  title,
  meta,
  empty,
  rows,
  fundamentals,
  growth,
  growthScored = 0,
  tone,
}: {
  title: ReactNode;
  meta: ReactNode;
  empty: ReactNode;
  rows: SetupsTableRow[];
  fundamentals: Record<string, FundRow>;
  growth?: Record<string, GrowthRow>;
  growthScored?: number;
  tone: "bull" | "bear";
}) {
  const { vis, set, reset } = useColumnPrefs(
    `canary.setupsCols.${tone}.v5`,
    COLS.map((c) => c.key),
    GROWTH_DEFAULT,
    COLS.filter((c) => c.locked).map((c) => c.key)
  );
  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2">
        {title}
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-right text-[10px] uppercase tracking-wide text-canary-gold/80">{meta}</p>
          {growth ? <ColumnsMenu options={MENU_OPTIONS} visible={vis} onChange={set} onReset={reset} /> : null}
        </div>
      </div>
      {rows.length === 0 ? (
        empty
      ) : (
        <>
          <SetupsTable rows={rows} fundamentals={fundamentals} tone={tone} growth={growth} growthScored={growthScored} visible={growth ? vis : undefined} />
          <SetupsTableLegend growth={Boolean(growth)} />
        </>
      )}
    </>
  );
}
