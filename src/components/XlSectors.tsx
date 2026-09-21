"use client";

import { useEffect, useState } from "react";
import type { MarketQuotesPayload, SectorQuoteItem } from "@/lib/marketQuotes";

function formatPx(n: number): string {
  return n.toFixed(2);
}

function SectorTile({ item }: { item: SectorQuoteItem }) {
  const q = item.quote;
  const tip = `${item.symbol} — ${item.name}`;
  if (!q) {
    return (
      <div
        title={tip}
        className="cursor-help rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-2.5"
      >
        <p className="text-xs font-semibold text-slate-500">{item.symbol}</p>
        <p className="mt-1 text-xs text-slate-600">—</p>
      </div>
    );
  }
  const pct = q.changePct;
  const up = pct != null && pct >= 0;
  const down = pct != null && pct < 0;
  return (
    <div
      title={tip}
      className="cursor-help rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5"
    >
      <p className="text-xs font-semibold tracking-wide text-slate-300">
        {item.symbol}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-white">
        {formatPx(q.last)}
      </p>
      {pct != null ? (
        <p
          className={`mt-0.5 text-xs font-semibold tabular-nums ${
            up
              ? "text-canary-green"
              : down
                ? "text-canary-red"
                : "text-slate-400"
          }`}
        >
          {up ? "+" : ""}
          {pct.toFixed(2)}%
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-slate-600">n/a</p>
      )}
    </div>
  );
}

/**
 * Display XL sectors from SSR initial (cache/empty), then hydrate via
 * /api/members/quotes after paint — keeps Yahoo off the critical path.
 * Client kept only for post-paint fill (no interaction handlers otherwise).
 */
export function XlSectors({ data: initial }: { data: MarketQuotesPayload }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members/quotes", {
          credentials: "same-origin",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as MarketQuotesPayload;
        if (!cancelled) setData(json);
      } catch {
        /* soft-fail — keep SSR skeleton/cache */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="xl-sectors"
      className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
        XL sector prices
      </h2>
      <p className="mt-1 text-xs leading-snug text-slate-400">
        Select Sector SPDRs ranked best → worst today. Hover a tile for the full
        sector name.
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
        Education only · ranked by day %
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data.sectors.map((s) => (
          <SectorTile key={s.symbol} item={s} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-600">
        Yahoo delayed quotes · missing symbols fail soft
      </p>
    </section>
  );
}
