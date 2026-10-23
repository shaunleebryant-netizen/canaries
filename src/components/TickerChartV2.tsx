"use client";

/**
 * Ticker lightbox v2 (owner t581u 2026-10-08, approved t583s2392; flag MEMBERS_TICKER_CHART_V2, default ON).
 * Daily candlesticks (~12 months, opens on ~6) with our marks on the bars, from the members-only
 * /api/members/chart/[ticker] JSON (precomputed by scripts/build-ticker-charts.mjs with the same
 * engine ports as the boxes). Chart: TradingView Lightweight Charts™ (Apache-2.0; attribution logo
 * on the chart + notice in the footer, as the licence asks). The old TradingView widget stays as a tab.
 * Education only.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { INTERVAL_VIEW, loadTradingViewScript, StarToggle, type ChartInterval } from "@/components/TickerChartLightbox";
import { toTradingViewSymbol } from "@/lib/tradingViewSymbol";

export type MarkKind = "fish" | "smile" | "mfi" | "m20" | "sweat" | "skull";
export type ChartDoc = {
  v: number;
  t: string;
  name: string | null;
  asOf: string;
  d0: number;
  b: [number, number, number, number, number, number | null][];
  m: [number, MarkKind][];
  engines?: { mfi: string | null };
};

export const MARKS: Record<MarkKind, { emoji: string; label: string; side: "bull" | "bear" }> = {
  fish: { emoji: "🐟", label: "Fish", side: "bull" },
  smile: { emoji: "🙂", label: "Smiley", side: "bull" },
  mfi: { emoji: "💵", label: "MFI washout", side: "bull" },
  m20: { emoji: "📈", label: "Monthly trend turned up", side: "bull" },
  sweat: { emoji: "🥵", label: "Sweaty", side: "bear" },
  skull: { emoji: "💀", label: "Skull", side: "bear" },
};
const ORDER: MarkKind[] = ["fish", "smile", "mfi", "m20", "sweat", "skull"];

const ymdOf = (d0: number, off: number) => new Date((d0 + off) * 86400000).toISOString().slice(0, 10);
const fmtPx = (x: number) => (x >= 1000 ? x.toFixed(0) : x >= 1 ? x.toFixed(2) : x.toPrecision(3));

export function useChartDoc(ticker: string) {
  const [state, setState] = useState<{ doc: ChartDoc | null; error: string | null; loading: boolean }>({
    doc: null,
    error: null,
    loading: true,
  });
  useEffect(() => {
    let live = true;
    setState({ doc: null, error: null, loading: true });
    fetch(`/api/members/chart/${encodeURIComponent(ticker)}`, { credentials: "same-origin" })
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) throw new Error(r.status === 404 ? "nodata" : `HTTP ${r.status}`);
        const doc = (await r.json()) as ChartDoc;
        if (live) setState({ doc, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (live) setState({ doc: null, error: e instanceof Error ? e.message : "error", loading: false });
      });
    return () => {
      live = false;
    };
  }, [ticker]);
  return state;
}

export function CandleChart({
  doc,
  topMargin = 0.1,
  spanWide = 128,
  spanNarrow = 66,
}: {
  doc: ChartDoc;
  topMargin?: number;
  /** Bars visible on open: wide hosts / hosts under 520px. Defaults = ~6 / ~3 months of stock trading days. */
  spanWide?: number;
  spanNarrow?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    void import("lightweight-charts").then((lc) => {
      if (disposed || !hostRef.current) return;
      const chart = lc.createChart(host, {
        autoSize: true,
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "#94a3b8",
          fontSize: 11,
          attributionLogo: true, // licence: link to tradingview.com on the chart
        },
        grid: {
          vertLines: { color: "rgba(148,163,184,0.06)" },
          horzLines: { color: "rgba(148,163,184,0.06)" },
        },
        rightPriceScale: { borderColor: "rgba(148,163,184,0.18)" },
        timeScale: { borderColor: "rgba(148,163,184,0.18)", rightOffset: 3 },
        crosshair: { mode: lc.CrosshairMode.Normal },
      });
      const candles = chart.addSeries(lc.CandlestickSeries, {
        upColor: "#34d399",
        downColor: "#f87171",
        borderVisible: false,
        wickUpColor: "#34d399",
        wickDownColor: "#f87171",
        priceLineColor: "rgba(245,158,11,0.6)", // amber, never yellow (owner rule)
      });
      candles.priceScale().applyOptions({ scaleMargins: { top: topMargin, bottom: 0.2 } });
      const times = doc.b.map(([o]) => ymdOf(doc.d0, o));
      candles.setData(doc.b.map(([, o, h, l, c], i) => ({ time: times[i], open: o, high: h, low: l, close: c })));
      if (doc.b.some((b) => b[5] != null)) {
        const vol = chart.addSeries(lc.HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        vol.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
        vol.setData(
          doc.b.map(([, o, , , c, v], i) => ({
            time: times[i],
            value: v ?? 0,
            color: c >= o ? "rgba(52,211,153,0.28)" : "rgba(248,113,113,0.28)",
          }))
        );
      }
      // Our marks: drawn by a small series primitive so the emojis read at a proper size
      // (built-in markers draw text at axis-label size). Bullish under the bar, bearish above.
      const byTime = new Map<string, MarkKind[]>();
      for (const [off, k] of doc.m) {
        if (!MARKS[k]) continue;
        const t = ymdOf(doc.d0, off);
        const list = byTime.get(t) ?? [];
        if (!list.includes(k)) list.push(k);
        byTime.set(t, list);
      }
      const barAt = new Map(times.map((t, i) => [t, doc.b[i]]));
      const items = [...byTime].map(([t, ks]) => ({
        t,
        high: barAt.get(t)?.[2] ?? 0,
        low: barAt.get(t)?.[3] ?? 0,
        bull: ks.filter((k) => MARKS[k].side === "bull").sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
        bear: ks.filter((k) => MARKS[k].side === "bear").sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
      }));
      candles.attachPrimitive({
        paneViews: () => [
          {
            zOrder: () => "top" as const,
            renderer: () => ({
              draw: (target) => {
                target.useMediaCoordinateSpace(({ context: ctx }) => {
                  const spacing = chart.timeScale().options().barSpacing;
                  const size = spacing >= 7 ? 14 : spacing >= 4 ? 12 : 10;
                  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  for (const it of items) {
                    const x = chart.timeScale().timeToCoordinate(it.t);
                    if (x == null) continue;
                    const yLow = candles.priceToCoordinate(it.low);
                    const yHigh = candles.priceToCoordinate(it.high);
                    if (yLow != null) it.bull.forEach((k, j) => ctx.fillText(MARKS[k].emoji, x, yLow + size * 0.85 + j * (size + 2)));
                    if (yHigh != null) it.bear.forEach((k, j) => ctx.fillText(MARKS[k].emoji, x, yHigh - size * 0.85 - j * (size + 2)));
                  }
                });
              },
            }),
          },
        ],
      });
      const n = doc.b.length;
      // ~6 months on desktop, ~3 on phones (scroll back for the full year).
      const span = host.clientWidth < 520 ? spanNarrow : spanWide;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - span), to: n + 2 });

      // Hover readout: date, OHLC, change, marks on that bar (DOM text, no React re-render).
      const marksByTime = new Map<string, string[]>();
      for (const [off, k] of doc.m) {
        const t = ymdOf(doc.d0, off);
        marksByTime.set(t, [...(marksByTime.get(t) ?? []), `${MARKS[k]?.emoji ?? ""} ${MARKS[k]?.label ?? k}`]);
      }
      const idxByTime = new Map(times.map((t, i) => [t, i]));
      const show = (t: string | null) => {
        const tip = tipRef.current;
        if (!tip) return;
        const i = t != null ? idxByTime.get(t) : n - 1;
        if (i == null) return;
        const [, o, h, l, c] = doc.b[i];
        const prev = i > 0 ? doc.b[i - 1][4] : null;
        const chg = prev ? ((c - prev) / prev) * 100 : null;
        const mk = marksByTime.get(times[i]);
        tip.textContent =
          `${times[i]}  O ${fmtPx(o)}  H ${fmtPx(h)}  L ${fmtPx(l)}  C ${fmtPx(c)}` +
          (chg != null ? `  ${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "") +
          (mk ? `  ·  ${mk.join(", ")}` : "");
      };
      show(null);
      chart.subscribeCrosshairMove((p) => show(p.time != null ? String(p.time) : null));
      cleanup = () => chart.remove();
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [doc, topMargin, spanWide, spanNarrow]);

  return (
    <div className="absolute inset-0">
      <div
        ref={tipRef}
        className="pointer-events-none absolute left-2 top-1.5 z-10 max-w-[calc(100%-4.5rem)] truncate rounded bg-slate-950/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 sm:text-[11px]"
        aria-live="off"
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  );
}

function TradingViewTab({ ticker, interval }: { ticker: string; interval: ChartInterval }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const id = `tv2_${Math.random().toString(36).slice(2)}`;
    host.innerHTML = `<div id="${id}" style="width:100%;height:100%"></div>`;
    let widget: { remove?: () => void } | null = null;
    let live = true;
    loadTradingViewScript()
      .then(() => {
        const TV = window.TradingView;
        if (!live || !TV?.MediumWidget) {
          if (live) setErr("TradingView chart unavailable.");
          return;
        }
        const view = INTERVAL_VIEW[interval] ?? INTERVAL_VIEW.D;
        widget = new TV.MediumWidget({
          container_id: id,
          symbols: [[ticker, `${toTradingViewSymbol(ticker)}|${view.range}`]],
          chartOnly: false,
          width: "100%",
          height: "100%",
          locale: "en",
          colorTheme: "dark",
          autosize: true,
          isTransparent: true,
          dateRange: view.range,
          showFloatingTooltip: true,
          showVolume: false,
        });
      })
      .catch(() => live && setErr("Could not load TradingView."));
    return () => {
      live = false;
      try {
        widget?.remove?.();
      } catch {
        /* ignore */
      }
      host.innerHTML = "";
    };
  }, [ticker, interval]);
  return (
    <>
      {err ? <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">{err}</p> : null}
      <div ref={hostRef} className="absolute inset-0" />
    </>
  );
}

export function TickerChartDialogV2({
  ticker,
  interval = "D",
  onClose,
  titleId,
  name,
  star,
}: {
  ticker: string;
  interval?: ChartInterval;
  onClose: () => void;
  titleId: string;
  name?: string;
  star?: { inUniverse: (t: string) => boolean; has: (t: string) => boolean; toggle: (t: string) => void };
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { doc, error, loading } = useChartDoc(ticker);
  // Weekly / monthly links (Baby Bulls etc.) keep opening on the TradingView view.
  const [tab, setTab] = useState<"marks" | "tv">(interval === "D" ? "marks" : "tv");
  useEffect(() => {
    if (error === "nodata") setTab("tv");
  }, [error]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    queueMicrotask(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const latest = useMemo(() => {
    if (!doc) return [] as { k: MarkKind; date: string }[];
    const last = new Map<MarkKind, string>();
    for (const [off, k] of doc.m) last.set(k, ymdOf(doc.d0, off));
    return ORDER.filter((k) => last.has(k)).map((k) => ({ k, date: last.get(k)! }));
  }, [doc]);

  const title = doc?.name || name;
  const tvSymbol = toTradingViewSymbol(ticker);
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-2 sm:items-center sm:p-6" role="presentation">
      <button type="button" aria-label="Close chart" className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl ring-1 ring-canary-gold/20"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="flex min-w-0 items-center gap-1.5 text-lg font-semibold tracking-wide text-white">
              <span className="shrink-0">{ticker}</span>
              {star && star.inUniverse(ticker) ? (
                <StarToggle ticker={ticker} starred={star.has(ticker)} onToggle={star.toggle} className="text-base" />
              ) : null}
              {title ? <span className="truncate text-sm font-normal text-slate-300">{title}</span> : null}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {tab === "marks"
                ? `Daily candles · ~12 months${doc ? ` · to ${doc.asOf}` : ""} · education only`
                : `${(INTERVAL_VIEW[interval] ?? INTERVAL_VIEW.D).label} · TradingView · ${tvSymbol}`}
              {" · "}
              <a href={tvUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 underline decoration-white/20 underline-offset-2 hover:text-canary-gold">
                Open on TradingView ↗
              </a>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/5 px-4 py-2 sm:px-5">
          <div role="tablist" aria-label="Chart view" className="inline-flex rounded-lg border border-white/10 bg-slate-900/70 p-0.5 text-xs">
            {(
              [
                ["marks", "Canary marks"],
                ["tv", "TradingView"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                disabled={id === "marks" && error === "nodata"}
                className={`rounded-md px-2.5 py-1 font-medium transition disabled:opacity-40 ${
                  tab === id ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "marks" && latest.length ? (
            <ul className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400" aria-label="Latest marks">
              <li className="text-slate-500">Latest:</li>
              {latest.map(({ k, date }) => (
                <li key={k} className="whitespace-nowrap" title={`${MARKS[k].label} on ${date}`}>
                  <span aria-hidden>{MARKS[k].emoji}</span> <span className="tabular-nums">{date.slice(5)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="relative h-[min(56vh,520px)] min-h-[300px] shrink-0 bg-slate-950">
          {tab === "marks" ? (
            doc ? (
              <CandleChart doc={doc} />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-slate-400">
                {loading ? "Loading chart…" : error === "nodata" ? "No Canary chart for this ticker yet." : "Could not load the chart."}
              </p>
            )
          ) : (
            <TradingViewTab ticker={ticker} interval={interval} />
          )}
        </div>

        {tab === "marks" ? (
          <div className="shrink-0 border-t border-white/10 px-4 py-2 sm:px-5" aria-label="Mark key">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
              {ORDER.map((k) => (
                <li key={k} className="whitespace-nowrap">
                  <span aria-hidden>{MARKS[k].emoji}</span>{" "}
                  <span className={MARKS[k].side === "bull" ? "text-emerald-300/80" : "text-rose-300/80"}>{MARKS[k].label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">
              Bullish marks sit under the bars, bearish above. Same marks as the dashboard boxes.
              {doc && !doc.engines?.mfi ? " 💵 is not scanned for this ticker." : ""}
            </p>
          </div>
        ) : null}

        <p className="shrink-0 border-t border-white/10 px-4 py-2 text-[10px] leading-snug text-slate-500 sm:px-5">
          Education only. Not buy or sell advice. No order buttons from Canary. Charts by{" "}
          <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-slate-300">
            TradingView Lightweight Charts™
          </a>{" "}
          · Copyright © 2025 TradingView, Inc.
        </p>
      </div>
    </div>
  );
}
