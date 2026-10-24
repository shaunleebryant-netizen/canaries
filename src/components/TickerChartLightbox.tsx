"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { toTradingViewSymbol } from "@/lib/tradingViewSymbol";
import { useMyStocks } from "@/lib/myStocksStore";
import type { UniverseGroup } from "@/lib/tickerUniverse";

/** v2 candlestick + marks dialog (owner t581u PREVIEW); own chunk, only loaded when v2 is on. */
const TickerChartDialogV2 = dynamic(() => import("@/components/TickerChartV2").then((m) => m.TickerChartDialogV2), {
  ssr: false,
});

/** Classic host still serves tv.js; s.tradingview.com/tv.js now 301→404. */
const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

type TradingViewWidgetCtor = new (options: Record<string, unknown>) => {
  remove?: () => void;
};

declare global {
  interface Window {
    TradingView?: {
      widget: TradingViewWidgetCtor;
      MediumWidget?: TradingViewWidgetCtor;
    };
  }
}

/** Chart bar interval for the lightbox: daily (default), weekly, monthly. */
export type ChartInterval = "D" | "W" | "M";

export const INTERVAL_VIEW: Record<
  ChartInterval,
  { range: string; label: string; linkTitle: string }
> = {
  D: { range: "3M", label: "Daily · ~3 months", linkTitle: "daily chart (~3 months)" },
  W: { range: "60M", label: "Weekly · ~5 years", linkTitle: "weekly chart (~5 years)" },
  M: { range: "ALL", label: "Monthly · full history", linkTitle: "monthly chart (full history)" },
};

type TickerChartContextValue = {
  openTicker: (ticker: string, interval?: ChartInterval) => void;
  /** My Stocks (owner t583u PREVIEW): star toggles on universe tickers. Off → no stars. */
  myStocks?: {
    inUniverse: (ticker: string) => boolean;
    has: (ticker: string) => boolean;
    toggle: (ticker: string) => void;
  };
  names?: Record<string, string>;
};

const TickerChartContext = createContext<TickerChartContextValue | null>(null);

let tvScriptPromise: Promise<void> | null = null;

export function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView?.MediumWidget || window.TradingView?.widget) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;

  tvScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TV_SCRIPT_SRC}"]`
    );
    if (existing) {
      if (window.TradingView?.MediumWidget || window.TradingView?.widget) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("TradingView script failed")),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TradingView script failed"));
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

function TickerChartDialog({
  ticker,
  interval = "D",
  open,
  onClose,
  titleId,
  closeRef,
}: {
  ticker: string | null;
  interval?: ChartInterval;
  open: boolean;
  onClose: () => void;
  titleId: string;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const containerId = useId().replace(/:/g, "");
  const widgetRef = useRef<{ remove?: () => void } | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
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
  }, [open, onClose, closeRef]);

  useEffect(() => {
    if (!open || !ticker) {
      setChartReady(false);
      setChartError(null);
      if (widgetRef.current?.remove) {
        try {
          widgetRef.current.remove();
        } catch {
          /* ignore */
        }
      }
      widgetRef.current = null;
      return;
    }

    let cancelled = false;
    setChartReady(false);
    setChartError(null);

    const host = chartHostRef.current;
    if (host) {
      host.innerHTML = "";
      const mount = document.createElement("div");
      mount.id = `tv_${containerId}`;
      mount.style.width = "100%";
      mount.style.height = "100%";
      host.appendChild(mount);
    }

    loadTradingViewScript()
      .then(() => {
        const TV = window.TradingView;
        if (cancelled || !TV) {
          if (!cancelled) setChartError("Chart widget unavailable.");
          return;
        }
        const symbol = toTradingViewSymbol(ticker);
        const view = INTERVAL_VIEW[interval] ?? INTERVAL_VIEW.D;
        const mountId = `tv_${containerId}`;
        try {
          // Prefer MediumWidget: free Advanced Chart embed currently ignores
          // interval "D" and locks to 1h; MediumWidget honors dateRange "3M"
          // with daily (D) series — matches education Daily · ~3 months intent.
          if (TV.MediumWidget) {
            widgetRef.current = new TV.MediumWidget({
              container_id: mountId,
              // Symbol-overview ranges map to bar size: 3M → daily,
              // 60M → weekly, ALL → monthly.
              symbols: [[ticker, `${symbol}|${view.range}`]],
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
          } else if (TV.widget) {
            widgetRef.current = new TV.widget({
              autosize: true,
              symbol,
              interval,
              range: view.range,
              timezone: "Etc/UTC",
              theme: "dark",
              style: "1",
              locale: "en",
              toolbar_bg: "#020617",
              enable_publishing: false,
              hide_top_toolbar: true,
              hide_side_toolbar: true,
              allow_symbol_change: false,
              save_image: false,
              details: false,
              hotlist: false,
              calendar: false,
              studies: [],
              container_id: mountId,
            });
          } else {
            if (!cancelled) setChartError("Chart widget unavailable.");
            return;
          }
          if (!cancelled) setChartReady(true);
        } catch {
          if (!cancelled) setChartError("Could not load chart.");
        }
      })
      .catch(() => {
        if (!cancelled) setChartError("Could not load TradingView script.");
      });

    return () => {
      cancelled = true;
      if (widgetRef.current?.remove) {
        try {
          widgetRef.current.remove();
        } catch {
          /* ignore */
        }
      }
      widgetRef.current = null;
      if (chartHostRef.current) chartHostRef.current.innerHTML = "";
    };
  }, [open, ticker, interval, containerId]);

  if (!open || !ticker) return null;

  const tvSymbol = toTradingViewSymbol(ticker);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close chart"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl ring-1 ring-canary-gold/20"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-lg font-semibold tracking-wide text-white"
            >
              {ticker}
              <span className="ml-2 text-sm font-normal text-slate-400">
                {(INTERVAL_VIEW[interval] ?? INTERVAL_VIEW.D).label} · education only
              </span>
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              TradingView · {tvSymbol} · no trade actions from this dashboard
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

        <div className="relative min-h-[min(58vh,520px)] flex-1 bg-slate-950">
          {!chartReady && !chartError ? (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
              Loading chart…
            </p>
          ) : null}
          {chartError ? (
            <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-slate-400">
              {chartError}
            </p>
          ) : null}
          <div ref={chartHostRef} className="absolute inset-0" />
        </div>

        <p className="shrink-0 border-t border-white/10 px-4 py-2.5 text-[11px] leading-snug text-slate-500 sm:px-5">
          Education only — chart for study context. Not buy/sell advice. No
          order buttons from Canary.
        </p>
      </div>
    </div>
  );
}

/**
 * Shared lightbox provider — wrap members SCAN content so Fish / Exhaustion /
 * MFI Scan / Bullish Setups share one TradingView chart modal.
 */
export function TickerChartProvider({
  children,
  v2 = false,
  myStocks = false,
  universe,
  names,
}: {
  children: ReactNode;
  /** MEMBERS_TICKER_CHART_V2 / design preview: candlestick + marks dialog. */
  v2?: boolean;
  /** MEMBERS_MY_STOCKS / design preview: star toggles + watchlist. */
  myStocks?: boolean;
  /** Our scanner universe (stars and My Stocks only accept these tickers). */
  universe?: UniverseGroup[];
  names?: Record<string, string>;
}) {
  const allowed = useMemo(
    () => (universe ? new Set(universe.flatMap((g) => g.items.map((i) => i.ticker.toUpperCase()))) : undefined),
    [universe]
  );
  const stars = useMyStocks(allowed);
  const [ticker, setTicker] = useState<string | null>(null);
  const [interval, setChartInterval] = useState<ChartInterval>("D");
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const openTicker = useCallback((next: string, iv: ChartInterval = "D") => {
    setChartInterval(iv);
    lastTriggerRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    setTicker(next.trim().toUpperCase());
  }, []);

  const onClose = useCallback(() => {
    setTicker(null);
    queueMicrotask(() => lastTriggerRef.current?.focus?.());
  }, []);

  const { has, toggle } = stars;
  const starList = stars.list.join(",");
  const myStocksValue = useMemo(
    () =>
      myStocks && allowed
        ? { inUniverse: (t: string) => allowed.has(t.toUpperCase()), has, toggle }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myStocks, allowed, toggle, starList]
  );
  const value = useMemo(
    () => ({ openTicker, myStocks: myStocksValue, names }),
    [openTicker, myStocksValue, names]
  );

  return (
    <TickerChartContext.Provider value={value}>
      {children}
      {v2 ? (
        ticker != null ? (
          <TickerChartDialogV2
            ticker={ticker}
            interval={interval}
            onClose={onClose}
            titleId={titleId}
            name={names?.[ticker]}
            star={myStocksValue}
          />
        ) : null
      ) : (
        <TickerChartDialog
          ticker={ticker}
          interval={interval}
          open={ticker != null}
          onClose={onClose}
          titleId={titleId}
          closeRef={closeRef}
        />
      )}
    </TickerChartContext.Provider>
  );
}

export function useTickerChart(): TickerChartContextValue {
  const ctx = useContext(TickerChartContext);
  if (!ctx) {
    throw new Error("useTickerChart must be used within TickerChartProvider");
  }
  return ctx;
}

/**
 * Client button styled as ticker text — opens the shared chart lightbox.
 * Safe to nest inside server-rendered alert lists.
 */
export function TickerLink({
  ticker,
  className = "w-12 shrink-0 text-left font-semibold tracking-wide text-white",
  interval = "D",
  children,
  noStar = false,
}: {
  ticker: string;
  className?: string;
  /** Hide the My Stocks star (rows that already show one). */
  noStar?: boolean;
  /** Lightbox bar interval — daily (default), weekly or monthly. */
  interval?: ChartInterval;
  children?: ReactNode;
}) {
  const { openTicker, myStocks } = useTickerChart();
  const label = children ?? ticker;

  const link = (
    <button
      type="button"
      onClick={() => openTicker(ticker, interval)}
      className={`${className} cursor-pointer rounded-sm underline decoration-canary-gold/40 decoration-dotted underline-offset-2 transition hover:text-canary-gold hover:decoration-canary-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60`}
      title={`Open ${ticker} ${INTERVAL_VIEW[interval].linkTitle}`}
      aria-haspopup="dialog"
      aria-label={`Open chart for ${ticker}`}
    >
      {label}
    </button>
  );
  if (noStar || !myStocks || !myStocks.inUniverse(ticker)) return link;
  return (
    <>
      {link}
      <StarToggle ticker={ticker} starred={myStocks.has(ticker)} onToggle={myStocks.toggle} />
    </>
  );
}

/** ☆/★ My Stocks toggle (owner t583u PREVIEW). Sibling of the ticker button (never nested). */
export function StarToggle({
  ticker,
  starred,
  onToggle,
  className = "",
}: {
  ticker: string;
  starred: boolean;
  onToggle: (ticker: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(ticker);
      }}
      aria-pressed={starred}
      aria-label={starred ? `Remove ${ticker} from My Stocks` : `Add ${ticker} to My Stocks`}
      title={starred ? "In My Stocks (tap to remove)" : "Add to My Stocks"}
      className={`-ml-0.5 shrink-0 rounded px-0.5 text-[13px] leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60 ${
        starred ? "text-canary-gold" : "text-slate-600 hover:text-canary-gold/80"
      } ${className}`}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}
