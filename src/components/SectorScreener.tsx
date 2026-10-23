/**
 * Sector Screener (owner t691u 2026-10-14; APPROVED t693u; flag MEMBERS_SECTOR_SCREENER, default ON).
 * Daily glance at the 11 SPDR sectors: returns, relative strength vs SPY, month-by-month rank
 * heatmap and today's ETF Watch marks. Data: data/sector-screener.json (scripts/build-sector-screener.mjs).
 * Server component; no client JS. Never invents numbers: missing values show "—".
 */
import raw from "../../data/sector-screener.json";
import countryRaw from "../../data/country-screener.json";
import type { EtfWatchAlert, EtfWatchKind } from "@/lib/loadEtfWatchAlerts";

interface Row {
  symbol: string; name: string; last: number;
  r1d: number | null; r1w: number | null; r1m: number | null; r3m: number | null; ytd: number | null;
  rs1m: number | null; rs3m: number | null; monthly: (number | null)[]; ranks: (number | null)[];
}
export interface ScreenerData { asOf: string; months: string[]; rows: Row[]; spy: Record<string, number | null>; failed: string[] }
const sectorData = raw as unknown as ScreenerData;
const countryData = countryRaw as unknown as ScreenerData;

const EMOJI: Record<EtfWatchKind, string> = { smile: "🙂", fish: "🐟", exhaustion: "🥵", skull: "💀" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mLabel = (k: string) => MON[Number(k.slice(5, 7)) - 1];

function Pct({ v, bold }: { v: number | null; bold?: boolean }) {
  if (v == null) return <span className="text-slate-600">—</span>;
  const r = Math.round(v * 10) / 10; // avoid "-0.0%"
  const c = r > 0 ? "text-canary-green" : r < 0 ? "text-canary-red" : "text-slate-400";
  return <span className={`tabular-nums ${c} ${bold ? "font-semibold" : ""}`}>{r > 0 ? "+" : ""}{(r === 0 ? 0 : r).toFixed(1)}%</span>;
}

/** rank 1 (best) → green, middle → neutral, last (worst) → red */
function rankStyle(r: number | null, count: number): React.CSSProperties {
  if (r == null) return {};
  const t = (r - 1) / Math.max(1, count - 1); // 0..1
  const a = 0.15 + Math.abs(t - 0.5) * 1.1;
  return { backgroundColor: t < 0.5 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})` };
}

export interface ScreenerConfig {
  id: string; title: string; subtitle: string; rowLabel: string; count: number;
  preview?: boolean; footnote?: React.ReactNode; dense?: boolean;
}

export function Screener({ data, cfg, etfAlerts }: { data: ScreenerData; cfg: ScreenerConfig; etfAlerts: EtfWatchAlert[] }) {
  const rows = [...data.rows].sort((a, b) => (b.r1d ?? -99) - (a.r1d ?? -99));
  const n = data.months.length;
  const cur = n - 1, prev = n - 2;
  const marks = new Map(etfAlerts.map((a) => [a.ticker, a.signals.map((s) => EMOJI[s]).join("")]));
  const byMonth = [...data.rows].sort((a, b) => (a.ranks[cur] ?? 99) - (b.ranks[cur] ?? 99));
  const top = rows.slice(0, 3), bottom = rows.slice(-3).reverse();
  const heatMonths = data.months.map((m, i) => ({ m, i, old: i < n - 6 })).slice(-12);

  return (
    <article id={cfg.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-canary-gold">{cfg.title}
            {cfg.preview ? <span className="ml-2 rounded border border-amber-400/60 px-1.5 py-0.5 align-middle text-[9px] tracking-wide text-amber-300">PREVIEW</span> : null}</h3>
          <p className="text-[11px] text-slate-400">{cfg.subtitle} · close {data.asOf} · SPY today <Pct v={data.spy.r1d} /></p>
        </div>
      </header>

      {/* Leaders / laggards today */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[{ t: "Leading today", l: top }, { t: "Lagging today", l: bottom }].map(({ t, l }) => (
          <div key={t} className="rounded-lg border border-white/5 bg-slate-900/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{t}</p>
            {l.map((r) => (
              <p key={r.symbol} className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">{r.symbol} <span className="font-normal text-slate-500 hidden sm:inline">{r.name}</span></span>
                <Pct v={r.r1d} bold />
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* Returns table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[440px] text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-500">
            <tr className="text-right">
              <th className="py-1 text-left">{cfg.rowLabel}</th><th>1D</th><th>1W</th><th>1M</th><th>3M</th><th>YTD</th>
              <th title="1-month return minus SPY's">vs SPY 1M</th><th title="This month's rank vs last month's">Rank Δ</th><th className="text-center">Marks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rc = r.ranks[cur], rp = r.ranks[prev];
              const d = rc != null && rp != null ? rp - rc : null;
              return (
                <tr key={r.symbol} className={`border-t border-white/5 text-right${cfg.dense ? " [&>td]:py-0.5" : ""}`}>
                  <td className="py-1 text-left"><span className="font-semibold text-slate-100">{r.symbol}</span> <span className="hidden text-[11px] text-slate-500 sm:inline">{r.name}</span></td>
                  <td><Pct v={r.r1d} bold /></td><td><Pct v={r.r1w} /></td><td><Pct v={r.r1m} /></td>
                  <td><Pct v={r.r3m} /></td><td><Pct v={r.ytd} /></td><td><Pct v={r.rs1m} /></td>
                  <td className={`tabular-nums ${d == null || d === 0 ? "text-slate-500" : d > 0 ? "text-canary-green" : "text-canary-red"}`}>
                    {d == null ? "—" : d === 0 ? "=" : d > 0 ? `▲${d}` : `▼${-d}`}
                  </td>
                  <td className="text-center">{marks.get(r.symbol) ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Monthly rank heatmap */}
      <p className="mt-4 text-[10px] uppercase tracking-wide text-slate-500">Monthly rank (1 = best of {cfg.count}) · sorted by this month</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full sm:min-w-[520px] border-separate border-spacing-[2px] text-[11px]">
          <thead className="text-[10px] text-slate-500">
            <tr><th className="text-left">{cfg.rowLabel}</th>{heatMonths.map(({ m, i, old }) => (
              <th key={m} className={`${old ? "hidden sm:table-cell" : ""} ${i === cur ? "text-amber-300" : ""}`}>{mLabel(m)}{i === cur ? "*" : ""}</th>))}</tr>
          </thead>
          <tbody>
            {byMonth.map((r) => (
              <tr key={r.symbol}>
                <td className="pr-1 font-semibold text-slate-200">{r.symbol}</td>
                {heatMonths.map(({ m, i, old }) => (
                  <td key={m} style={rankStyle(r.ranks[i], cfg.count)}
                    title={`${r.symbol} ${m}: ${r.monthly[i] == null ? "—" : r.monthly[i]!.toFixed(1) + "%"}`}
                    className={`${old ? "hidden sm:table-cell" : ""} rounded text-center tabular-nums text-white ${i === cur ? "ring-1 ring-amber-400/60" : ""}`}>
                    {r.ranks[i] ?? "—"}
                  </td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        * Month to date. Price returns from daily closes (dividends excluded). Marks are today&apos;s ETF Watch 🙂🐟🥵💀.
        {cfg.footnote ? <> {cfg.footnote}</> : null} Education only, not financial advice.
      </p>
    </article>
  );
}

export function SectorScreener({ etfAlerts }: { etfAlerts: EtfWatchAlert[] }) {
  return <Screener data={sectorData} etfAlerts={etfAlerts}
    cfg={{ id: "sector-screener", title: "Sector Screener", subtitle: "11 SPDR sectors", rowLabel: "Sector", count: 11 }} />;
}

/** Country Screener (owner approved t696u 2026-10-14; flag MEMBERS_COUNTRY_SCREENER, default ON). */
export function CountryScreener({ etfAlerts }: { etfAlerts: EtfWatchAlert[] }) {
  return <Screener data={countryData} etfAlerts={etfAlerts}
    cfg={{ id: "country-screener", title: "Country Screener", subtitle: `${countryData.rows.length} country ETFs (USD)`,
      rowLabel: "Country", count: 20, dense: true,
      footnote: <>Country ETFs trade in US dollars, so returns include currency moves vs the USD.</> }} />;
}
