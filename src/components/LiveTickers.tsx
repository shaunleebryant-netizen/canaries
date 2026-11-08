"use client";

import { useCallback, useEffect, useState } from "react";
import { useTickerChart } from "@/components/TickerChartLightbox";
import type { MarketQuotesPayload, TickerStripItem } from "@/lib/marketQuotes";
import { quoteStripChartTicker } from "@/lib/quoteStripChart";
import { isFreeEtfChart } from "@/lib/etfChartAccess";

function formatPx(n: number): string {
  if (Math.abs(n) >= 1000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function PlainQuote({ item }: { item: TickerStripItem }) {
  const q = item.quote;
  const pct = q?.changePct;
  const up = pct != null && pct >= 0;
  const down = pct != null && pct < 0;
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-1.5 py-0.5 text-center" aria-label={`${item.label} quote`}>
      <p className="truncate text-[13px] font-semibold uppercase leading-tight tracking-wide text-slate-300">{item.label}</p>
      {q ? (
        <div className="flex flex-wrap items-baseline justify-center gap-x-1 leading-tight">
          <span className="text-base font-semibold tabular-nums text-white">{formatPx(q.last)}</span>
          {pct != null ? (
            <span className={`text-sm font-semibold tabular-nums ${up ? "text-canary-green" : down ? "text-canary-red" : "text-slate-400"}`}>
              {up ? "+" : ""}
              {pct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-base text-slate-600">n/a</span>
          )}
        </div>
      ) : (
        <p className="text-base leading-tight text-slate-600">—</p>
      )}
    </div>
  );
}

function TickerChip({ item, interactive }: { item: TickerStripItem; interactive: boolean }) {
  const { openTicker } = useTickerChart();
  const chartTicker = quoteStripChartTicker(item.id, item.label);
  const q = item.quote;
  if (!interactive) return <PlainQuote item={item} />;
  const tip = `${item.description} Open the daily chart.`;
  const open = () => openTicker(chartTicker);
  if (!q) {
    return (
      <button
        type="button"
        title={tip}
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`Open chart for ${item.label}`}
        className="min-w-0 flex-1 cursor-pointer rounded-lg border border-dashed border-white/10 bg-slate-950/40 px-1.5 py-0.5 text-center transition hover:border-canary-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60"
      >
        <p className="truncate text-[13px] font-semibold uppercase leading-tight tracking-wide text-slate-400 underline decoration-canary-gold/40 decoration-dotted underline-offset-2">
          {item.label}
        </p>
        <p className="text-base leading-tight text-slate-600">—</p>
      </button>
    );
  }
  const pct = q.changePct;
  const up = pct != null && pct >= 0;
  const down = pct != null && pct < 0;
  return (
    <button
      type="button"
      title={tip}
      onClick={open}
      aria-haspopup="dialog"
      aria-label={`Open chart for ${item.label}, last ${formatPx(q.last)}`}
      className="min-w-0 flex-1 cursor-pointer rounded-lg border border-white/10 bg-slate-950/50 px-1.5 py-0.5 text-center shadow-sm transition hover:border-canary-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60"
    >
      <p className="truncate text-[13px] font-semibold uppercase leading-tight tracking-wide text-slate-300 underline decoration-canary-gold/40 decoration-dotted underline-offset-2">
        {item.label}
      </p>
      <div className="flex flex-wrap items-baseline justify-center gap-x-1 leading-tight">
        <span className="text-base font-semibold tabular-nums text-white">
          {formatPx(q.last)}
        </span>
        {pct != null ? (
          <span
            className={`text-sm font-semibold tabular-nums ${
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
          <span className="text-base text-slate-600">n/a</span>
        )}
      </div>
    </button>
  );
}

export function LiveTickers({
  initial,
  chartAccess = "paid",
}: {
  initial: MarketQuotesPayload;
  chartAccess?: "paid" | "free-etf";
}) {
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
      className="rounded-xl border border-white/10 bg-slate-900/60 px-2 py-1 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase leading-none tracking-widest text-canary-gold">
          Live quotes
        </h2>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded-md border border-white/10 bg-slate-950/50 px-1.5 py-0 text-[10px] leading-4 font-medium text-slate-300 transition hover:border-canary-gold/40 hover:text-canary-gold disabled:opacity-50"
        >
          {busy ? "…" : "Refresh"}
        </button>
      </div>
      <div className="mt-1 grid w-full grid-cols-3 items-stretch gap-1 sm:flex sm:flex-nowrap sm:justify-between">
        {data.tickers.map((t) => {
          const symbol = quoteStripChartTicker(t.id, t.label);
          const interactive = t.id !== "vix" && (chartAccess === "paid" || isFreeEtfChart(symbol));
          return <TickerChip key={t.id} item={t} interactive={interactive} />;
        })}
      </div>
    </section>
  );
}
