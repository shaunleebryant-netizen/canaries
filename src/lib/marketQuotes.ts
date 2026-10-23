/**
 * Live tickers + XL sector quotes for members dashboard.
 * Soft-fail per symbol; brief in-memory cache for Workers.
 */
import {
  fetchQuote,
  fetchQuoteFallback,
  type YahooFetchFail,
  type YahooQuote,
} from "./yahooFinance";
import quotesCacheJson from "../../data/market-quotes-cache.json";

export interface TickerStripItem {
  id: string;
  label: string;
  yahooSymbol: string;
  /** Plain-English hover blurb for new traders. */
  description: string;
  quote: YahooQuote | null;
  error?: string;
}

export interface SectorQuoteItem {
  symbol: string;
  /** Full sector name for hover. */
  name: string;
  quote: YahooQuote | null;
  error?: string;
}

export interface MarketQuotesPayload {
  asOf: string;
  tickers: TickerStripItem[];
  sectors: SectorQuoteItem[];
  failed: YahooFetchFail[];
}

/** Select Sector SPDRs + real estate. */
export const XL_SECTORS: ReadonlyArray<{ symbol: string; name: string }> = [
  { symbol: "XLC", name: "Communication Services" },
  { symbol: "XLY", name: "Consumer Discretionary" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLV", name: "Health Care" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLRE", name: "Real Estate" },
];


/** Strip + XL skeletons with null quotes — shell paints without Yahoo. */
const TICKER_SKELETON: ReadonlyArray<{
  id: string;
  label: string;
  yahooSymbol: string;
  description: string;
}> = [
  {
    id: "spx",
    label: "SPX",
    yahooSymbol: "^GSPC",
    description: "S&P 500: the main index of big US companies.",
  },
  {
    id: "qqq",
    label: "QQQ",
    yahooSymbol: "QQQ",
    description: "Nasdaq 100 fund: the biggest tech and growth companies.",
  },
  {
    id: "vix",
    label: "VIX",
    yahooSymbol: "^VIX",
    description: "VIX: the market's fear gauge. Higher means more nervous.",
  },
  {
    id: "wti",
    label: "WTI",
    yahooSymbol: "CL=F",
    description: "US crude oil price.",
  },
  {
    id: "xau",
    label: "XAUUSD",
    yahooSymbol: "GC=F",
    description:
      "Gold price in US dollars, often a safe haven in worried times.",
  },
  {
    id: "btc",
    label: "BTCUSD",
    yahooSymbol: "BTC-USD",
    description: "Bitcoin price in US dollars, a read on appetite for risk.",
  },
];

const STRIP_IDS = new Set(TICKER_SKELETON.map((t) => t.id));

/** Empty/partial payload for SSR shell — no Yahoo on critical path. */
export function emptyMarketQuotes(): MarketQuotesPayload {
  return {
    asOf: "",
    tickers: TICKER_SKELETON.map((t) => ({
      id: t.id,
      label: t.label,
      yahooSymbol: t.yahooSymbol,
      description: t.description,
      quote: null,
    })),
    sectors: XL_SECTORS.map(({ symbol, name }) => ({
      symbol,
      name,
      quote: null,
    })),
    failed: [],
  };
}

/**
 * Prefer bundled last-good cache when present and populated; else empty skeleton.
 * Never hits Yahoo — safe for members page critical path.
 */
export function loadMarketQuotesInitial(): MarketQuotesPayload {
  const cached = quotesCacheJson as Partial<MarketQuotesPayload>;
  if (
    cached &&
    Array.isArray(cached.tickers) &&
    cached.tickers.length > 0 &&
    cached.tickers.some((t) => t?.quote != null)
  ) {
    return {
      asOf: typeof cached.asOf === "string" ? cached.asOf : "",
      // Bundled cache may still carry retired strip tickers (e.g. RSP) — show strip set only.
      tickers: (cached.tickers as TickerStripItem[])
        .filter((t) => STRIP_IDS.has(t?.id))
        // Always use the current plain-English blurbs, not the cached copy.
        .map((t) => ({
          ...t,
          description:
            TICKER_SKELETON.find((k) => k.id === t.id)?.description ??
            t.description,
        })),
      sectors: Array.isArray(cached.sectors)
        ? (cached.sectors as SectorQuoteItem[])
        : emptyMarketQuotes().sectors,
      failed: Array.isArray(cached.failed) ? (cached.failed as MarketQuotesPayload["failed"]) : [],
    };
  }
  return emptyMarketQuotes();
}

type CacheEntry = { at: number; payload: MarketQuotesPayload };
let cache: CacheEntry | null = null;
const CACHE_MS = 60_000;

async function quoteOrFail(
  symbol: string,
  label: string
): Promise<{ quote: YahooQuote } | { error: string }> {
  return fetchQuote(symbol, label);
}

export async function loadMarketQuotes(
  opts: { bypassCache?: boolean } = {}
): Promise<MarketQuotesPayload> {
  if (!opts.bypassCache && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.payload;
  }

  const failed: YahooFetchFail[] = [];

  const wti = await fetchQuoteFallback([
    { symbol: "CL=F", label: "WTI" },
    { symbol: "USO", label: "WTI" },
  ]);
  const xau = await fetchQuoteFallback([
    { symbol: "GC=F", label: "XAUUSD" },
    { symbol: "XAUUSD=X", label: "XAUUSD" },
  ]);
  const btc = await fetchQuoteFallback([
    { symbol: "BTC-USD", label: "BTCUSD" },
  ]);
  const simple: Array<{
    id: string;
    label: string;
    symbol: string;
    description: string;
  }> = [
    {
      id: "spx",
      label: "SPX",
      symbol: "^GSPC",
      description: "S&P 500: the main index of big US companies.",
    },
    {
      id: "qqq",
      label: "QQQ",
      symbol: "QQQ",
      description: "Nasdaq 100 fund: the biggest tech and growth companies.",
    },
    {
      id: "vix",
      label: "VIX",
      symbol: "^VIX",
      description: "VIX: the market's fear gauge. Higher means more nervous.",
    },
  ];

  const tickers: TickerStripItem[] = [];

  for (const t of simple) {
    const r = await quoteOrFail(t.symbol, t.label);
    if ("quote" in r) {
      tickers.push({
        id: t.id,
        label: t.label,
        yahooSymbol: r.quote.symbol,
        description: t.description,
        quote: r.quote,
      });
    } else {
      failed.push({ symbol: t.symbol, label: t.label, error: r.error });
      tickers.push({
        id: t.id,
        label: t.label,
        yahooSymbol: t.symbol,
        description: t.description,
        quote: null,
        error: r.error,
      });
    }
  }

  function pushFallback(
    id: string,
    label: string,
    description: string,
    result: { quote: YahooQuote } | { error: string },
    primarySymbol: string
  ) {
    if ("quote" in result) {
      tickers.push({
        id,
        label,
        yahooSymbol: result.quote.symbol,
        description,
        quote: { ...result.quote, label },
      });
    } else {
      failed.push({ symbol: primarySymbol, label, error: result.error });
      tickers.push({
        id,
        label,
        yahooSymbol: primarySymbol,
        description,
        quote: null,
        error: result.error,
      });
    }
  }

  // Order: SPX, QQQ, VIX, WTI, XAUUSD, BTCUSD (RSP removed 2026-09-25; SP600 removed from the strip 2026-09-26 — owner. SP600 stays in the scanners.)

  pushFallback(
    "wti",
    "WTI",
    "US crude oil price.",
    wti,
    "CL=F"
  );
  pushFallback(
    "xau",
    "XAUUSD",
    "Gold price in US dollars, often a safe haven in worried times.",
    xau,
    "GC=F"
  );
  pushFallback(
    "btc",
    "BTCUSD",
    "Bitcoin price in US dollars, a read on appetite for risk.",
    btc,
    "BTC-USD"
  );
  const sectors: SectorQuoteItem[] = [];
  for (const { symbol, name } of XL_SECTORS) {
    const r = await quoteOrFail(symbol, symbol);
    if ("quote" in r) {
      sectors.push({ symbol, name, quote: r.quote });
    } else {
      failed.push({ symbol, error: r.error });
      sectors.push({ symbol, name, quote: null, error: r.error });
    }
  }

  // Best → worst day performance (missing % sorts last)
  sectors.sort((a, b) => {
    const ap = a.quote?.changePct;
    const bp = b.quote?.changePct;
    if (ap == null && bp == null) return a.symbol.localeCompare(b.symbol);
    if (ap == null) return 1;
    if (bp == null) return -1;
    return bp - ap;
  });

  const payload: MarketQuotesPayload = {
    asOf: new Date().toISOString(),
    tickers,
    sectors,
    failed,
  };
  cache = { at: Date.now(), payload };
  return payload;
}
