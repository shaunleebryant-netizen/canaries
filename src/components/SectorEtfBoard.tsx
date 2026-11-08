"use client";

import { useState } from "react";
import raw from "../../data/sector-screener.json";
import { TickerLink } from "@/components/TickerChartLightbox";
import {
  leadersAndLaggards,
  monthBars,
  monthReturn,
  performanceOrder,
  type SectorPack,
} from "@/lib/sectorEtfLayout";

const pack = raw as unknown as SectorPack;

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

/** Sector layout on the members ETF tab. Charts use the surrounding member chart. */
export function SectorEtfBoard() {
  const [open, setOpen] = useState<string | null>(null);
  const ordered = performanceOrder(pack.rows);
  const { leaders, laggards } = leadersAndLaggards(pack.rows);
  const bars = monthBars(pack.rows);
  const month = pack.months.at(-1) ?? "";
  const returns = bars.map((row) => monthReturn(row)).filter((value): value is number => value != null);
  const span = Math.max(1, ...returns.map((value) => Math.abs(value)));

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
      <p className="text-sm text-slate-400">11 SPDR sectors · closes through {pack.asOf || "—"}</p>
      {ordered.length === 0 ? <p className="mt-3 text-sm text-slate-400">No sector rows in this pack.</p> : null}

      {leaders.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ["Leading today", leaders],
            ["Lagging today", laggards],
          ].map(([title, list]) => (
            <section key={String(title)} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <h3 className="text-[10px] uppercase tracking-wide text-slate-500">{title as string}</h3>
              {(list as typeof leaders).map((row) => (
                <p key={row.symbol} className="mt-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-white">{row.symbol}</span>
                  <span className={tone(row.r1d)}>{pct(row.r1d)}</span>
                </p>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Sector view">
        <button type="button" role="tab" aria-selected="true" className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950">
          Performance
        </button>
      </div>

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

      {bars.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-[10px] uppercase tracking-wide text-slate-500">
            {month} rank · best to worst{pack.currentMonthPartial ? " · month to date" : ""}
          </h3>
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
      ) : null}
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Price returns from the sector file. A mark appears only with its recorded date.</p>
    </div>
  );
}
