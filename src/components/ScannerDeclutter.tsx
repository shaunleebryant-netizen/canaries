"use client";

/**
 * SCANNER_DECLUTTER shell: Canaries | Stocks | ETFs | Crypto | Insiders (| My Stocks) … Backtest (far right) tabs, Mark key on Stocks,
 * Sub Scanners accordion. Boxes are equal-height scroll (globals.css). Does not change data.
 */
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SHOW_LIMIT = 12;

const MARK_KEY_HIDDEN = "canary.markKeyHidden";
const MAIN_HIDDEN = "canary.mainScannerHidden";

export function ScannerEmojiLegend() {
  // Owner 2026-10-10: subtle "Hide" link; hidden → a thin "Show Mark Key" link. Remembered on this device.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(MARK_KEY_HIDDEN) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const setHide = (next: boolean) => {
    setHidden(next);
    try {
      localStorage.setItem(MARK_KEY_HIDDEN, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  // Same short labels as before; grouped Bullish / Bearish for newbies (owner 2026-10-02).
  // Marks match live boxes — meanings unchanged.
  type Mark = { emoji: string; label: string };
  const bullish: Mark[] = [
    { emoji: "🐟", label: "Fish — a sold-off name starting to find its feet" },
    { emoji: "🙂", label: "Washout — selling looks worn out" },
    { emoji: "💵", label: "MFI washout — selling washed out, money flow turning up" },
    { emoji: "🟢", label: "Weekly green — trend turned or staying bullish" },
  ];
  const bearish: Mark[] = [
    { emoji: "🥵", label: "Sweaty — a hard run that may be getting tired" },
    { emoji: "💀", label: "Skull — topping mark after a sweaty stretch" },
    { emoji: "🔴", label: "Weekly red — trend turned or staying bearish" },
  ];
  function Group({
    title,
    tone,
    items,
  }: {
    title: string;
    tone: "bull" | "bear";
    items: Mark[];
  }) {
    const head =
      tone === "bull"
        ? "text-emerald-300/90"
        : "text-rose-300/90";
    return (
      <div className="min-w-0 flex-1">
        <p
          className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${head}`}
        >
          {title}
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.emoji} className="flex items-start gap-1.5">
              <span className="shrink-0 text-sm leading-none" aria-hidden>
                {it.emoji}
              </span>
              <span className="leading-snug text-slate-400">{it.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (hidden) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setHide(false)}
          aria-expanded={false}
          className="px-1 py-0.5 text-[11px] text-slate-500 underline-offset-2 hover:text-canary-amber hover:underline"
        >
          Show Mark Key
        </button>
      </div>
    );
  }
  return (
    <div
      className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-400"
      aria-label="Scanner emoji legend"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Mark key</p>
        <button
          type="button"
          onClick={() => setHide(true)}
          aria-expanded={true}
          aria-label="Hide Mark Key"
          className="-my-1 px-1.5 py-1 text-[11px] text-slate-500 underline-offset-2 hover:text-canary-amber hover:underline"
        >
          Hide
        </button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <Group title="Bullish" tone="bull" items={bullish} />
        <Group title="Bearish" tone="bear" items={bearish} />
      </div>
    </div>
  );
}

/**
 * Passthrough wrapper around a scanner box.
 * Owner 2026-10-05: lists are equal-height scroll boxes (26rem in globals.css),
 * not "Show all" that expands the page. `limit` kept for call-site compat.
 */
export function ScannerShowMore({
  children,
  limit: _limit = SHOW_LIMIT,
}: {
  children: ReactNode;
  limit?: number;
}) {
  return <div className="scanner-show-more min-h-0">{children}</div>;
}

export type DeclutterTab = "canaries" | "stocks" | "etf" | "crypto" | "insiders" | "history" | "mystocks";

/** Old/in-page anchors that live on the Insiders tab (owner 2026-10-10: Insider Buying moved off Stocks). */
const INSIDER_HASHES = new Set(["#insiders", "#insider-buying", "#insider-history"]);

export function ScannerDeclutterShell({
  canaries,
  main,
  moreScans,
  etf,
  crypto,
  insiders,
  history,
  myStocks,
  initialTab = "stocks",
  toolbarEnd,
}: {
  canaries: ReactNode;
  main: ReactNode;
  moreScans: ReactNode;
  etf: ReactNode;
  crypto: ReactNode;
  /** Owner 2026-10-10: "Insiders" tab right of Crypto (Insider Buying + Past insider buys). Omitted → no tab. */
  insiders?: ReactNode;
  /** Owner approved 2026-10-07: 5th "History" tab (MEMBERS_HISTORY_TAB). Omitted → 4 tabs as before. */
  history?: ReactNode;
  /** Owner t583u (PREVIEW, MEMBERS_MY_STOCKS default OFF): "My Stocks" watchlist tab. Omitted → no tab. */
  myStocks?: ReactNode;
  /** Owner 2026-10-10: shown on the tab-bar row, right of Backtest (e.g. "Ticker Universe").
   *  Phones: sits above the scrolling tab bar, right-aligned. */
  toolbarEnd?: ReactNode;
  /** Deep link (/members?tab=history). Falls back to Canaries. */
  initialTab?: DeclutterTab;
}) {
  const [tab, setTab] = useState<DeclutterTab>(
    (initialTab === "history" && !history) ||
      (initialTab === "mystocks" && !myStocks) ||
      (initialTab === "insiders" && !insiders)
      ? "stocks"
      : initialTab
  );
  const [moreOpen, setMoreOpen] = useState(true);
  // Owner t698u 2026-10-14: Main Scanner can be hidden like Sub Scanners; remembered on this device.
  const [mainOpen, setMainOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(MAIN_HIDDEN) === "1") setMainOpen(false);
    } catch {
      /* ignore */
    }
  }, []);
  const toggleMain = () =>
    setMainOpen((v) => {
      try {
        localStorage.setItem(MAIN_HIDDEN, v ? "1" : "0");
      } catch {
        /* ignore */
      }
      return !v;
    });
  const tablistRef = useRef<HTMLDivElement>(null);
  // 6–7 tabs overflow on phones, so keep the selected tab in view (Backtest sits last, far right).
  useEffect(() => {
    const list = tablistRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    const left = el.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
    if (left < list.scrollLeft || left + el.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollLeft = Math.max(0, left + el.offsetWidth - list.clientWidth + 8);
  }, [tab]);

  // Links that pointed at the Insider Buying box (#insider-buying) or the history box still land:
  // open the Insiders tab, then scroll to the anchor once it renders.
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  useEffect(() => {
    if (!insiders) return;
    const go = () => {
      const h = window.location.hash;
      if (INSIDER_HASHES.has(h)) {
        setTab("insiders");
        setPendingHash(h);
      }
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [insiders]);
  useEffect(() => {
    if (!pendingHash || tab !== "insiders") return;
    const id = pendingHash === "#insiders" ? "insiders-tab" : pendingHash.slice(1);
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 50);
    setPendingHash(null);
    return () => window.clearTimeout(t);
  }, [pendingHash, tab]);

  const tabs: { id: DeclutterTab; label: string }[] = [
    { id: "stocks", label: "Stocks" },
    { id: "etf", label: "ETFs" },
    { id: "crypto", label: "Crypto" },
    ...(insiders ? [{ id: "insiders" as const, label: "Insiders" }] : []),
    ...(myStocks ? [{ id: "mystocks" as const, label: "My Stocks" }] : []),
  ];
  // Owner 2026-10-10: Backtest is separate from the scanner tabs, pinned to the far right of the bar
  // (last when the bar scrolls on phones). Owner t572u: the "history" tab is shown as "Backtest".
  const tabBtn = (t: { id: DeclutterTab; label: string }) => (
    <button
      key={t.id}
      type="button"
      role="tab"
      aria-selected={tab === t.id}
      onClick={() => setTab(t.id)}
      className={`whitespace-nowrap rounded-md px-2.5 sm:px-3 py-1.5 font-medium transition ${
        tab === t.id ? "bg-sky-500/20 text-sky-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {t.label}
    </button>
  );
  const pill = "inline-flex shrink-0 rounded-lg border border-white/10 bg-slate-950/70 p-0.5";

  return (
    <div data-scanner-declutter="1" className="space-y-4">
      {/* Owner 2026-10-10: tabs + "Ticker Universe" share one row when the column is wide
          enough (container query in globals.css, so it follows the Risk Guidance panel open/collapsed);
          narrower → the button sits above the scrolling tab bar, right-aligned. */}
      <div className="scan-tabrow-wrap min-w-0">
      <div className="scan-tabrow flex min-w-0 flex-col-reverse gap-2">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Scanner universe"
        className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-x-auto text-sm [scrollbar-width:thin]"
      >
        <div className={pill}>{tabs.map(tabBtn)}</div>
        {history ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-1">
            <span aria-hidden className="h-5 w-px bg-white/15" />
            {/* Owner t697u 2026-10-14: Canaries sits beside Backtest; Stocks is the landing tab. */}
            <div className={pill}>
              {tabBtn({ id: "canaries", label: "Canaries" })}
              {tabBtn({ id: "history", label: "Backtest" })}
            </div>
          </div>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-1">
            <span aria-hidden className="h-5 w-px bg-white/15" />
            <div className={pill}>{tabBtn({ id: "canaries", label: "Canaries" })}</div>
          </div>
        )}
      </div>
      {toolbarEnd ? <div className="flex shrink-0 justify-end">{toolbarEnd}</div> : null}
      </div>
      </div>

      {tab === "canaries" ? (
        <div className="space-y-3">{canaries}</div>
      ) : null}

      {tab === "stocks" ? (
        <div className="space-y-4">
          <ScannerEmojiLegend />
          {mainOpen ? (
            <div className="relative">
              <button
                type="button"
                aria-expanded={true}
                aria-label="Hide Main Scanner"
                onClick={toggleMain}
                className="absolute right-0 top-0 z-10 px-1.5 py-1 text-[11px] text-slate-500 underline-offset-2 hover:text-canary-amber hover:underline"
              >
                Hide ▴
              </button>
              {main}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-950/40">
              <button
                type="button"
                aria-expanded={false}
                onClick={toggleMain}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-slate-500">▸</span>
                  Main Scanner
                  <span className="text-[11px] font-normal text-slate-500">Bullish Setups · Bearish Setups · Canary Score ranking</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500">Show</span>
              </button>
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-slate-950/40">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-slate-500">
                  {moreOpen ? "▾" : "▸"}
                </span>
                Sub Scanners
                <span className="text-[11px] font-normal text-slate-500">
                  Time to fish · Sweaty stocks · MFI · IBD · Baby Bulls · Multi-week Warriors
                </span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {moreOpen ? "Hide" : "Show"}
              </span>
            </button>
            {moreOpen ? (
              <div className="border-t border-white/5 px-3 pb-3 pt-3">
                {moreScans}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "etf" ? <div className="space-y-3">{etf}</div> : null}

      {tab === "crypto" ? <div className="space-y-3">{crypto}</div> : null}

      {tab === "insiders" && insiders ? (
        <div id="insiders-tab" className="space-y-3">
          {insiders}
        </div>
      ) : null}

      {tab === "history" && history ? <div className="space-y-3">{history}</div> : null}

      {tab === "mystocks" && myStocks ? <div className="space-y-3">{myStocks}</div> : null}
    </div>
  );
}
