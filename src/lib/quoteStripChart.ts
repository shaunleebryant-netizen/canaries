/**
 * Members "Live quotes" strip → ticker the shared lightbox already understands.
 * Chart packs exist for SPX, QQQ, XAUUSD, and BTCUSD. VIX and WTI have no pack;
 * the lightbox still opens and uses the TradingView tab (nodata path).
 */
export const QUOTE_STRIP_CHARTS: Record<string, { ticker: string; name: string }> = {
  spx: { ticker: "SPX", name: "S&P 500" },
  qqq: { ticker: "QQQ", name: "Invesco QQQ" },
  vix: { ticker: "VIX", name: "CBOE Volatility Index" },
  wti: { ticker: "WTI", name: "WTI crude oil" },
  xau: { ticker: "XAUUSD", name: "Gold" },
  btc: { ticker: "BTCUSD", name: "Bitcoin" },
};

export function quoteStripChartTicker(id: string, label = ""): string {
  return QUOTE_STRIP_CHARTS[id]?.ticker ?? label;
}

export function quoteStripChartNames(): Record<string, string> {
  const names: Record<string, string> = {};
  for (const row of Object.values(QUOTE_STRIP_CHARTS)) names[row.ticker] = row.name;
  return names;
}
