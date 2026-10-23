"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketQuotesPayload, TickerStripItem } from "@/lib/marketQuotes";

function formatPx(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 100) return n.toFixed(2);
  return n.toFixed(2);
}

function TickerChip({ item }: { item: TickerStripItem }) {
  const q = item.quote;
  const tip = item.description;
  if (!q) {
    return (
      <div
        title={tip}
        className="shrink-0 cursor-help rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-2"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {item.label}
        </p>
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
      className="shrink-0 cursor-help rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {item.label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums text-white">
          {formatPx(q.last)}
        </span>
        {pct != null ? (
          <span
            className={`text-xs font-semibold tabular-nums ${
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
  const [seenInitial, setSeenInitial] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (seenInitial !== initial) {
    setSeenInitial(initial);
    setData(initial);
  }

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

  // Fill strip after shell paint — do not block SSR on Yahoo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members/quotes?refresh=1", {
          credentials: "same-origin",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as MarketQuotesPayload;
        if (!cancelled) setData(json);
      } catch {
        /* soft-fail */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="live-tickers"
      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
            Live quotes
          </h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-canary-gold/40 hover:text-canary-gold disabled:opacity-50"
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.tickers.map((t) => (
          <TickerChip key={t.id} item={t} />
        ))}
      </div>
    </section>
  );
}
