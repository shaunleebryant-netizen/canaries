"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketQuotesPayload, TickerStripItem } from "@/lib/marketQuotes";

function formatPx(n: number): string {
  if (Math.abs(n) >= 1000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function TickerChip({ item }: { item: TickerStripItem }) {
  const q = item.quote;
  const tip = item.description;
  if (!q) {
    return (
      <div
        title={tip}
        className="min-w-0 flex-1 cursor-help rounded-lg border border-dashed border-white/10 bg-slate-950/40 px-2 py-1.5 text-center"
      >
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
          {item.label}
        </p>
        <p className="mt-0.5 text-sm text-slate-600">—</p>
      </div>
    );
  }
  const pct = q.changePct;
  const up = pct != null && pct >= 0;
  const down = pct != null && pct < 0;
  return (
    <div
      title={tip}
      className="min-w-0 flex-1 cursor-help rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-center shadow-sm"
    >
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
        {item.label}
      </p>
      <div className="mt-0.5 flex flex-wrap items-baseline justify-center gap-x-1">
        <span className="text-sm font-semibold tabular-nums text-white sm:text-base">
          {formatPx(q.last)}
        </span>
        {pct != null ? (
          <span
            className={`text-xs font-semibold tabular-nums sm:text-sm ${
              up
                ? "text-canary-green"
                : down
                  ? "text-canary-red"
                  : "text-slate-400"
            }`}
          >
            {up ? "+" : ""}
            {pct.toFixed(2)}%
          </span>
        ) : (
          <span className="text-xs text-slate-600">n/a</span>
        )}
      </div>
    </div>
  );
}

export function LiveTickers({ initial }: { initial: MarketQuotesPayload }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/members/quotes?refresh=1", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const json = (await res.json()) as MarketQuotesPayload;
        setData(json);
      }
    } catch {
      /* soft-fail */
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  // Fill strip after shell paint — do not block SSR on Yahoo.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section
      id="live-tickers"
      className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-canary-gold sm:text-sm">
          Live quotes
        </h2>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded-md border border-white/10 bg-slate-950/50 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-canary-gold/40 hover:text-canary-gold disabled:opacity-50"
        >
          {busy ? "…" : "Refresh"}
        </button>
      </div>
      <div className="mt-2 grid w-full grid-cols-3 items-stretch gap-1.5 sm:flex sm:flex-nowrap sm:justify-between">
        {data.tickers.map((t) => (
          <TickerChip key={t.id} item={t} />
        ))}
      </div>
    </section>
  );
}
