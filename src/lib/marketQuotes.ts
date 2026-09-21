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
    description: "S&P 500 — the main US large-company stock index.",
  },
  {
    id: "qqq",
    label: "QQQ",
    yahooSymbol: "QQQ",
    description: "Nasdaq-100 ETF — big growth and tech names.",
  },
  {
    id: "sp600",
    label: "SP600",
    yahooSymbol: "^SP600",
    description:
      "S&P SmallCap 600 index — smaller US companies (stricter quality filter than the Russell 2000).",
  },
  {
    id: "rsp",
    label: "RSP",
    yahooSymbol: "RSP",
    description: "Equal-weight S&P 500 — less mega-cap dominated than SPX.",
  },
  {
    id: "vix",
    label: "VIX",
    yahooSymbol: "^VIX",
    description: "CBOE Volatility Index — expected near-term stock-market fear.",
  },
  {
    id: "wti",
    label: "WTI",
    yahooSymbol: "CL=F",
    description: "West Texas Intermediate crude oil — US oil price benchmark.",
  },
  {
    id: "xau",
    label: "XAUUSD",
    yahooSymbol: "GC=F",
    description:
      "Gold vs US dollar — often watched as a fear / inflation / dollar hedge.",
  },
  {
    id: "btc",
    label: "BTCUSD",
    yahooSymbol: "BTC-USD",
    description: "Bitcoin vs US dollar — risk appetite outside traditional stocks.",
  },
];

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
      tickers: cached.tickers as TickerStripItem[],
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

  const sp600 = await fetchQuoteFallback([
    { symbol: "^SP600", label: "SP600" },
    { symbol: "IJR", label: "SP600" },
  ]);
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
      description: "S&P 500 — the main US large-company stock index.",
    },
    {
      id: "qqq",
      label: "QQQ",
      symbol: "QQQ",
      description: "Nasdaq-100 ETF — big growth and tech names.",
    },
    {
      id: "rsp",
      label: "RSP",
      symbol: "RSP",
      description: "Equal-weight S&P 500 — less mega-cap dominated than SPX.",
    },
    {
      id: "vix",
      label: "VIX",
      symbol: "^VIX",
      description: "CBOE Volatility Index — expected near-term stock-market fear.",
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

  // Order: SPX, QQQ, SP600, RSP, VIX, WTI, XAUUSD, BTCUSD
  tickers.splice(2, 0); // no-op placeholder; we insert SP600 at index 2
  const sp600Item: TickerStripItem =
    "quote" in sp600
      ? {
          id: "sp600",
          label: "SP600",
          yahooSymbol: sp600.quote.symbol,
          description:
            "S&P SmallCap 600 index — smaller US companies (stricter quality filter than the Russell 2000).",
          quote: { ...sp600.quote, label: "SP600" },
        }
      : {
          id: "sp600",
          label: "SP600",
          yahooSymbol: "^SP600",
          description:
            "S&P SmallCap 600 index — smaller US companies (stricter quality filter than the Russell 2000).",
          quote: null,
          error: sp600.error,
        };
  if (!("quote" in sp600)) {
    failed.push({ symbol: "^SP600/IJR", label: "SP600", error: sp600.error });
  }
  tickers.splice(2, 0, sp600Item);

  pushFallback(
    "wti",
    "WTI",
    "West Texas Intermediate crude oil — US oil price benchmark.",
    wti,
    "CL=F"
  );
  pushFallback(
    "xau",
    "XAUUSD",
    "Gold vs US dollar — often watched as a fear / inflation / dollar hedge.",
    xau,
    "GC=F"
  );
  pushFallback(
    "btc",
    "BTCUSD",
    "Bitcoin vs US dollar — risk appetite outside traditional stocks.",
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
