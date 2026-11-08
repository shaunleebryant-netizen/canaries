"use client";

import { useMemo, useState } from "react";
import raw from "../../../data/sector-screener.json";
import { TickerLink } from "@/components/TickerChartLightbox";
import { loadEtfWatchAlerts } from "@/lib/loadEtfWatchAlerts";
import {
  leadersAndLaggards,
  monthBars,
  monthReturn,
  performanceOrder,
  recordedMarks,
  type SectorPack,
} from "@/lib/etfTabPreview";

const pack = raw as unknown as SectorPack;
const MARK = { smile: "🙂", fish: "🐟", exhaustion: "🥵", skull: "💀" } as const;

function pct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const shown = rounded === 0 ? 0 : rounded;
  return `${shown > 0 ? "+" : ""}${shown.toFixed(1)}%`;
}

function tone(value: number | null): string {
  if (value == null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-300" : "text-red-300";
}

export function EtfTabPreview() {
  const [view, setView] = useState<"performance" | "signals">("performance");
  const [open, setOpen] = useState<string | null>(null);
  const alerts = useMemo(() => new Map(loadEtfWatchAlerts().map((row) => [row.ticker, row])), []);
  const ordered = performanceOrder(pack.rows);
  const { leaders, laggards } = leadersAndLaggards(pack.rows);
  const bars = monthBars(pack.rows);
  const month = pack.months.at(-1) ?? "";
  const returns = bars.map((row) => monthReturn(row)).filter((value): value is number => value != null);
  const span = Math.max(1, ...returns.map((value) => Math.abs(value)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-slate-100">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Preview · not the live ETF tab</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Sector ETFs</h1>
      <p className="mt-1 text-sm text-slate-400">11 SPDR sectors · closes through {pack.asOf}</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          ["Leading today", leaders],
          ["Lagging today", laggards],
        ].map(([title, list]) => (
          <section key={String(title)} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <h2 className="text-[10px] uppercase tracking-wide text-slate-500">{title as string}</h2>
            {(list as typeof leaders).map((row) => (
              <p key={row.symbol} className="mt-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-white">{row.symbol}</span>
                <span className={tone(row.r1d)}>{pct(row.r1d)}</span>
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Sector view">
        {(["performance", "signals"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === id ? "bg-amber-400 text-slate-950" : "border border-white/15 text-slate-300"}`}
          >
            {id === "performance" ? "Performance" : "Signals"}
          </button>
        ))}
      </div>

      {view === "performance" ? (
        <div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] px-3 py-2 text-[10px] uppercase tracking-wide text-slate-500">
            <span>Sector</span><span className="text-right">Today</span><span className="text-right">1 month</span>
          </div>
          {ordered.map((row) => {
            const expanded = open === row.symbol;
            return (
              <div key={row.symbol} className="px-3 py-2">
                <div className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TickerLink ticker={row.symbol} className="font-semibold text-white" noStar>{row.symbol}</TickerLink>
                    <span className="truncate text-xs text-slate-500">{row.name}</span>
                    <button type="button" className="text-[11px] text-amber-200" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : row.symbol)}>
                      {expanded ? "Hide" : "More"}
                    </button>
                  </div>
                  <span className={`text-right text-sm ${tone(row.r1d)}`}>{pct(row.r1d)}</span>
                  <span className={`text-right text-sm ${tone(row.r1m)}`}>{pct(row.r1m)}</span>
                </div>
                {expanded ? (
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300 sm:grid-cols-4">
                    <div><dt className="text-slate-500">1 week</dt><dd className={tone(row.r1w)}>{pct(row.r1w)}</dd></div>
                    <div><dt className="text-slate-500">3 month</dt><dd className={tone(row.r3m)}>{pct(row.r3m)}</dd></div>
                    <div><dt className="text-slate-500">YTD</dt><dd className={tone(row.ytd)}>{pct(row.ytd)}</dd></div>
                    <div><dt className="text-slate-500">vs SPY 1M</dt><dd className={tone(row.rs1m)}>{pct(row.rs1m)}</dd></div>
                  </dl>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
          {ordered.map((row) => {
            const marks = recordedMarks(alerts.get(row.symbol));
            return (
              <li key={row.symbol} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-semibold text-white">{row.symbol} <span className="font-normal text-slate-500">{row.name}</span></span>
                {marks.length ? (
                  <span className="text-slate-300">
                    {marks.map((mark) => `${MARK[mark.kind]} ${mark.date}`).join(" · ")}
                  </span>
                ) : (
                  <span className="text-slate-500">No dated mark</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-6">
        <h2 className="text-[10px] uppercase tracking-wide text-slate-500">
          {month} rank · best to worst{pack.currentMonthPartial ? " · month to date" : ""}
        </h2>
        <ol className="mt-2 space-y-1.5">
          {bars.map((row) => {
            const value = monthReturn(row);
            const width = value == null ? 0 : Math.max(4, (Math.abs(value) / span) * 100);
            return (
              <li key={row.symbol} className="grid grid-cols-[4.5rem_1fr_4.2rem] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-200">{row.symbol}</span>
                <span className="h-2 overflow-hidden rounded bg-white/5">
                  <span className={`block h-full rounded ${value != null && value < 0 ? "bg-red-400/80" : "bg-emerald-400/80"}`} style={{ width: `${width}%` }} />
                </span>
                <span className={`text-right ${tone(value)}`}>{pct(value)}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">Price returns from the sector file. A mark appears only with its recorded date.</p>
    </div>
  );
}
