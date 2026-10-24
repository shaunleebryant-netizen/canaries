"use client";

/**
 * "My Stocks" tab (owner t583u 2026-10-08, approved t583s2392; flag MEMBERS_MY_STOCKS, default ON).
 * Members star tickers in any scanner box or the chart lightbox, or add them here by search.
 * Universe-only (no arbitrary tickers). Saved on this device (localStorage) for now; moves to the
 * member's account once accounts auth is live (see src/lib/myStocksStore.ts). Education only.
 */
import { useMemo, useState } from "react";
import { CONDITION_META } from "@/components/MainScannerSetups";
import { StarToggle, TickerLink, useTickerChart } from "@/components/TickerChartLightbox";
import { useMyStocks } from "@/lib/myStocksStore";
import type { MyStockCond, MyStockRow, MyStocksUniverseItem } from "@/lib/myStocksData";
import type { SetupCondition } from "@/lib/setupsCore.mjs";
import type { GrowthRow } from "@/lib/loadGrowthScore";
import { GrowthCell } from "@/components/GrowthScore";

function Icons({ conds }: { conds: MyStockCond[] }) {
  return (
    <>
      {conds.map((c) => {
        const meta = CONDITION_META[c.id];
        if (!meta) return null;
        const full = { ...c, detail: "" } as SetupCondition;
        return (
          <span key={c.id} title={`${meta.label(full)}${c.since && c.id !== "weekly_bull" && c.id !== "weekly_bear" ? ` · ${c.since}` : ""}`} className="leading-none">
            {meta.icon(full)}
          </span>
        );
      })}
    </>
  );
}

export function MyStocks({
  rows,
  universe,
  asOf,
  growth,
  growthScored = 0,
}: {
  rows: Record<string, MyStockRow>;
  universe: MyStocksUniverseItem[];
  asOf: string;
  /** Growth Score rows (owner 2026-10-10, flag MEMBERS_GROWTH_SCORE): score + breakdown card per row. */
  growth?: Record<string, GrowthRow>;
  growthScored?: number;
}) {
  const allowed = useMemo(() => new Set(universe.map((u) => u.t)), [universe]);
  const byTicker = useMemo(() => new Map(universe.map((u) => [u.t, u])), [universe]);
  const { list, add, toggle, has } = useMyStocks(allowed);
  const { openTicker } = useTickerChart();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);

  const matches = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return [];
    const starts = universe.filter((u) => u.t.startsWith(s));
    const named = universe.filter((u) => !u.t.startsWith(s) && (u.t.includes(s) || u.n?.toUpperCase().includes(s)));
    return [...starts, ...named].slice(0, 8);
  }, [q, universe]);

  const pick = (t: string) => {
    add(t);
    setQ("");
  };

  return (
    <section aria-labelledby="my-stocks-label" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="my-stocks-label" className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg">
            My Stocks
          </h2>
          <p className="text-xs text-slate-400">
            Your saved tickers with today&apos;s marks · as of {asOf} · saved on this device
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <label htmlFor="my-stocks-search" className="sr-only">
            Add a ticker from our universe
          </label>
          <input
            id="my-stocks-search"
            type="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) {
                e.preventDefault();
                pick(matches[0].t);
              }
            }}
            placeholder="Add a ticker (our universe only)…"
            className="w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-canary-gold/50 focus:outline-none"
          />
          {focus && q.trim() ? (
            <ul className="absolute right-0 z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-white/15 bg-slate-950 py-1 text-sm shadow-xl">
              {matches.length ? (
                matches.map((m) => (
                  <li key={m.t}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(m.t)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5"
                    >
                      <span className="w-16 shrink-0 font-semibold text-white">{m.t}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{m.n ?? m.g}</span>
                      <span className="text-xs text-canary-gold">{has(m.t) ? "★ saved" : "+ Add"}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-xs text-slate-400">Not in our scanner universe.</li>
              )}
            </ul>
          ) : null}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-slate-950/40 px-4 py-8 text-center">
          <p className="text-2xl text-slate-600" aria-hidden>
            ☆
          </p>
          <p className="mt-1 text-sm font-medium text-slate-200">No saved stocks yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
            Tap the ☆ next to any ticker in the scanners or on a chart, or search above to add one
            from our universe. Your list shows each ticker&apos;s latest marks.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-950/50">
          {list.map((t) => {
            const r = rows[t];
            const u = byTicker.get(t);
            const none = !r || (r.bull.length === 0 && r.bear.length === 0);
            return (
              <li key={t} className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm">
                <StarToggle ticker={t} starred onToggle={toggle} />
                <div className="flex w-[4.5rem] shrink-0 items-center sm:w-20">
                  <TickerLink ticker={t} noStar className="shrink-0 font-semibold tracking-wide text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-400">{u?.n ?? u?.g ?? ""}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px]">
                    {none ? (
                      <span className="text-[11px] text-slate-500">No current marks</span>
                    ) : (
                      <>
                        <Icons conds={r.bull} />
                        {r.bull.length && r.bear.length ? <span className="text-slate-600">|</span> : null}
                        <Icons conds={r.bear} />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                  {growth?.[t]?.gs != null ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
                      Canary Score
                      <GrowthCell ticker={t} row={growth[t]} scored={growthScored} variant="wide" />
                    </span>
                  ) : null}
                  {r?.setup ? (
                    <span
                      className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                        r.setup.side === "bull" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {r.setup.side === "bull" ? "Bullish" : "Bearish"} Setup · {r.setup.count}
                    </span>
                  ) : null}
                  <span className="text-[10px] tabular-nums text-slate-500">
                    {r?.last ? `last mark ${r.last.slice(5)}` : "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openTicker(t)}
                  className="hidden shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:border-canary-gold/40 hover:text-canary-gold sm:inline-block"
                  aria-label={`Open ${t} chart`}
                >
                  Chart
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[10px] text-slate-500">
        Icons match Bullish and Bearish Setups. Education only, not buy or sell advice.
      </p>
    </section>
  );
}
