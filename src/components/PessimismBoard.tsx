"use client";
/** UX preview: Pessimism Board — quality names that are washed out. Education only. */
import { useState } from "react";

export type PessRow = { t: string; offHigh: number; rsi: number; minRsi5: number; belowBB: boolean; rg: number | null; gs: number | null; emojis: string; turning: string[] };

const fmtDate = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—");

export function PessimismBoard({ rows, asOf, counts }: { rows: PessRow[]; asOf?: string; counts?: { priced?: number; washedOut?: number } }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <section id="pessimism-board" className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg">Pessimism Board</h2>
        <span className="text-[10px] text-slate-500">As of {fmtDate(asOf)} · {rows.length} of {counts?.washedOut ?? "—"} washed-out names pass the health check</span>
      </div>
      <p className="mt-1 text-xs italic text-amber-200">&ldquo;While peak optimism is hard to catch, peak pessimism is a lot easier.&rdquo;</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-400">
        Growing businesses whose share price has been sold down hard: 25%+ under the 52-week high and oversold (RSI 35 or lower in the last 5 sessions, or below the lower Bollinger band), with revenue still growing and a Canary Score of 40+. <span className="text-emerald-300">Turning</span> means the price has reclaimed its 20-day average or Fish/MFI fired. A washed-out stock can keep falling. Education only.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1.5 pr-2">#</th><th className="pr-2">Stock</th><th className="pr-2 text-right">% off high</th><th className="pr-2 text-right">RSI</th>
              <th className="pr-2 text-right">Rev Growth</th><th className="pr-2 text-right">Canary Score</th><th className="pr-2">Emojis</th><th>Turning</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.t} className="border-t border-white/5">
                <td className="py-1.5 pr-2 text-slate-500">{i + 1}</td>
                <td className="pr-2 font-semibold text-white">{r.t}</td>
                <td className="pr-2 text-right text-rose-300">−{Math.round(r.offHigh * 100)}%</td>
                <td className="pr-2 text-right">{r.rsi.toFixed(0)}{r.minRsi5 < r.rsi - 0.5 ? <span className="text-slate-500"> (low {r.minRsi5.toFixed(0)})</span> : null}{r.belowBB ? <span title="Below lower Bollinger band in the last 5 sessions" className="text-amber-300"> ↓BB</span> : null}</td>
                <td className="pr-2 text-right">{r.rg == null ? "—" : r.rg > 3 ? "300%+ (small base)" : `${r.rg >= 0 ? "+" : ""}${Math.round(r.rg * 100)}%`}</td>
                <td className="pr-2 text-right">{r.gs == null ? "—" : Math.round(r.gs)}</td>
                <td className="pr-2">{r.emojis || "—"}</td>
                <td>{r.turning.length ? <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">{r.turning.join(" · ")}</span> : <span className="text-slate-600">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 ? (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-xs text-amber-300 underline underline-offset-2">
          {all ? "Show fewer" : `Show more (${rows.length - 10})`}
        </button>
      ) : null}
    </section>
  );
}
