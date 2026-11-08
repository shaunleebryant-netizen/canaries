/**
 * Tickers a free preview account may chart: the Sector ETFs universe
 * (data/etf-watch-universe.json). That file is the ETF tab list, including
 * the index and metals symbols the tab already shows. It is not a stock list.
 */
import etfUniverse from "../../data/etf-watch-universe.json";

const TICKERS = (etfUniverse as { tickers?: string[] }).tickers ?? [];

export const FREE_ETF_CHARTS: ReadonlySet<string> = new Set(
  TICKERS.map((t) => t.toUpperCase()),
);

export function isFreeEtfChart(ticker: string): boolean {
  return FREE_ETF_CHARTS.has(ticker.trim().toUpperCase());
}
