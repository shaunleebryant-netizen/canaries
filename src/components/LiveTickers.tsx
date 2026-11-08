"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTickerChart } from "@/components/TickerChartLightbox";
import { DASHBOARD_QUOTE_TAPE_ID } from "@/components/TickerTape";
import type { MarketQuotesPayload, TickerStripItem } from "@/lib/marketQuotes";
import { quoteStripChartTicker, quoteStripInteractive } from "@/lib/quoteStripChart";

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
    <span className="inline-flex shrink-0 items-baseline gap-2 whitespace-nowrap px-3" aria-label={`${item.label} quote`}>
      <span className="font-semibold uppercase tracking-wide text-slate-300">{item.label}</span>
      {q ? (
        <>
          <span className="font-semibold tabular-nums text-white">{formatPx(q.last)}</span>
          {pct != null ? (
            <span className={`font-semibold tabular-nums ${up ? "text-canary-green" : down ? "text-canary-red" : "text-slate-400"}`}>
              {up ? "+" : ""}
              {pct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-slate-600">n/a</span>
          )}
        </>
      ) : (
        <span className="text-slate-600">—</span>
      )}
    </span>
  );
}

function TickerChip({ item, interactive }: { item: TickerStripItem; interactive: boolean }) {
  const { openTicker } = useTickerChart();
  const chartTicker = quoteStripChartTicker(item.id, item.label);
  const q = item.quote;
  if (!interactive) return <PlainQuote item={item} />;
  const tip = `${item.description} Open the daily chart.`;
  const open = () => openTicker(chartTicker);
  const chip = "inline-flex shrink-0 items-baseline gap-2 whitespace-nowrap px-3 underline decoration-canary-gold/40 decoration-dotted underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60";
  if (!q) {
    return (
      <button
        type="button"
        title={tip}
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`Open chart for ${item.label}`}
        className={`${chip} text-slate-400`}
      >
        <span className="font-semibold uppercase tracking-wide">{item.label}</span>
        <span className="text-slate-600 no-underline">—</span>
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
      className={`${chip} text-slate-300`}
    >
      <span className="font-semibold uppercase tracking-wide">{item.label}</span>
      <span className="font-semibold tabular-nums text-white no-underline">{formatPx(q.last)}</span>
      {pct != null ? (
        <span className={`font-semibold tabular-nums no-underline ${up ? "text-canary-green" : down ? "text-canary-red" : "text-slate-400"}`}>
          {up ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      ) : (
        <span className="text-slate-600 no-underline">n/a</span>
      )}
    </button>
  );
}

function useLiveQuotes(initial: MarketQuotesPayload) {
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

  return { data, busy, refresh };
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduce;
}

function TapeQuotes({ tickers, chartAccess }: { tickers: TickerStripItem[]; chartAccess: "paid" | "free-etf" }) {
  return (
    <>
      {tickers.map((item) => (
        <TickerChip
          key={item.id}
          item={item}
          interactive={quoteStripInteractive(item.id, item.label, chartAccess)}
        />
      ))}
    </>
  );
}

/**
 * Dashboard header tape. Same feed, instruments, refresh, and chart clicks as
 * the old quotes row. Renders into the top scrolling bar, not into the page body.
 */
export function LiveQuoteTape({
  initial,
  chartAccess = "paid",
}: {
  initial: MarketQuotesPayload;
  chartAccess?: "paid" | "free-etf";
}) {
  const { data, busy, refresh } = useLiveQuotes(initial);
  const reduce = usePrefersReducedMotion();
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(DASHBOARD_QUOTE_TAPE_ID));
  }, []);

  if (!slot) return null;

  return createPortal(
    <div className="flex items-center gap-2 px-3 py-1" role="region" aria-label="Live quotes">
      <div className={`ticker-tape min-w-0 flex-1 py-1 font-mono text-sm tracking-wide ${reduce ? "overflow-x-auto" : "overflow-hidden"}`}>
        <div className={reduce ? "flex w-max items-center" : "ticker-track flex w-max items-center"}>
          <div className="flex shrink-0 items-center">
            <TapeQuotes tickers={data.tickers} chartAccess={chartAccess} />
          </div>
          {reduce ? null : (
            <div className="flex shrink-0 items-center" aria-hidden inert>
              <TapeQuotes tickers={data.tickers} chartAccess={chartAccess} />
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="shrink-0 rounded-md border border-white/10 bg-slate-950/50 px-1.5 py-0 text-[10px] leading-4 font-medium text-slate-300 transition hover:border-canary-gold/40 hover:text-canary-gold disabled:opacity-50"
      >
        {busy ? "…" : "Refresh"}
      </button>
      {reduce ? null : (
        <style>{`
          .ticker-track{animation:ticker-scroll 45s linear infinite}
          .ticker-tape:hover .ticker-track,.ticker-tape:focus-within .ticker-track{animation-play-state:paused}
          @keyframes ticker-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        `}</style>
      )}
    </div>,
    slot,
  );
}
