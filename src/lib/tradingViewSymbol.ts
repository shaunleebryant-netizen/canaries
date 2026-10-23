/**
 * Map internal / Yahoo-style tickers to TradingView `exchange:symbol` when known.
 * Mirrors special cases from fish/monthly scanners (SYMBOL_CANDIDATES), but for TV.
 * Plain US equities: bare ticker (TV resolves well); prefer exchange: when known.
 */

/** Special / non-equity display tickers → TradingView symbol. */
const TV_SYMBOL_MAP: Record<string, string> = {
  BTCUSD: "BITSTAMP:BTCUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
  SOLUSD: "BINANCE:SOLUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
  XRPUSD: "BITSTAMP:XRPUSD",
  TRXUSD: "BINANCE:TRXUSDT",
  ZECUSD: "BINANCE:ZECUSDT",
  HYPEUSD: "BYBIT:HYPEUSDT",
  DOGEUSD: "BINANCE:DOGEUSDT",
  LINKUSD: "BINANCE:LINKUSDT",
  XMRUSD: "KRAKEN:XMRUSD",
  ADAUSD: "BINANCE:ADAUSDT",
  XLMUSD: "BINANCE:XLMUSDT",
  NEARUSD: "BINANCE:NEARUSDT",
  BCHUSD: "BINANCE:BCHUSDT",
  UNIUSD: "BINANCE:UNIUSDT",
  LEOUSD: "BITFINEX:LEOUSD",
  TOTAL: "CRYPTOCAP:TOTAL",
  XAUUSD: "TVC:GOLD",
  XAGUSD: "TVC:SILVER",
  SPX: "TVC:SPX",
  SP600: "TVC:SPSMC",
  // Futures / index aliases sometimes used in quotes
  "GC=F": "COMEX:GC1!",
  "SI=F": "COMEX:SI1!",
  "BTC-USD": "BITSTAMP:BTCUSD",
  "ETH-USD": "BITSTAMP:ETHUSD",
  "SOL-USD": "BINANCE:SOLUSDT",
  "BNB-USD": "BINANCE:BNBUSDT",
  "XRP-USD": "BITSTAMP:XRPUSD",
  "XAUUSD=X": "TVC:GOLD",
  "XAGUSD=X": "TVC:SILVER",
  "^GSPC": "TVC:SPX",
  "^SP600": "TVC:SPSMC",
};

/**
 * Known exchange prefixes for common ETFs / indexes that TV may mis-resolve bare.
 * Keep small — v1 prefers bare ticker for ordinary equities.
 */
const EXCHANGE_HINTS: Record<string, string> = {
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
  IWM: "AMEX:IWM",
  DIA: "AMEX:DIA",
  RSP: "AMEX:RSP",
  HYG: "AMEX:HYG",
  IEF: "AMEX:IEF",
  TLT: "NASDAQ:TLT",
  VIX: "CBOE:VIX",
  VIX3M: "CBOE:VIX3M",
  VTV: "AMEX:VTV",
  VUG: "AMEX:VUG",
  FXI: "AMEX:FXI",
  KWEB: "AMEX:KWEB",
  EWS: "AMEX:EWS",
  XLG: "AMEX:XLG",
  XLC: "AMEX:XLC",
  XLY: "AMEX:XLY",
  XLP: "AMEX:XLP",
  XLE: "AMEX:XLE",
  XLF: "AMEX:XLF",
  XLV: "AMEX:XLV",
  XLI: "AMEX:XLI",
  XLB: "AMEX:XLB",
  XLK: "AMEX:XLK",
  XLU: "AMEX:XLU",
  XLRE: "AMEX:XLRE",
  GLD: "AMEX:GLD",
  SLV: "AMEX:SLV",
  URA: "AMEX:URA",
  URNM: "AMEX:URNM",
  ETHU: "AMEX:ETHU",
  BTCL: "AMEX:BTCL",
  SOLZ: "AMEX:SOLZ",
};

/** Normalize and map a dashboard ticker to a TradingView widget symbol. */
export function toTradingViewSymbol(ticker: string): string {
  const raw = (ticker || "").trim().toUpperCase();
  if (!raw) return "SPY";

  if (TV_SYMBOL_MAP[raw]) return TV_SYMBOL_MAP[raw];
  if (EXCHANGE_HINTS[raw]) return EXCHANGE_HINTS[raw];

  // Already exchange-qualified
  if (raw.includes(":")) return raw;

  return raw;
}

export { TV_SYMBOL_MAP };
