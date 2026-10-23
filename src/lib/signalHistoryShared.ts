/**
 * Signal History types + client expansion (no data import — safe for client components).
 * Server loader: src/lib/loadSignalHistory.ts.
 */
export type HistoryKind = "fish" | "smile" | "mfi";
export type HistoryGroup = "stock" | "sector" | "country" | "crypto";

/** One row per ticker per session; several marks on the same day share a row (client shape). */
export interface SignalHistoryRow {
  id: string;
  date: string;
  ticker: string;
  name: string | null;
  group: HistoryGroup;
  kinds: HistoryKind[];
  priceAtSignal: number;
  priceNow: number | null;
  priceNowAsOf: string | null;
  /** Ticker has since left the scanner universe (kept for history, flagged). */
  removed: boolean;
}

/**
 * Compact wire payload (keeps the members page RSC payload small, ~1.9k rows):
 *   rows: [date, ticker, kinds ("f"|"s"|"m" letters), priceAtSignal]
 *   tickers: { [t]: [name, group, priceNow, priceNowAsOf, removed 0|1] }
 * Expanded on the client by expandSignalHistory().
 */
export interface SignalHistoryPayload {
  asOf: string | null;
  windowStart: string | null;
  sessions: number;
  markCount: number;
  rows: [string, string, string, number][];
  tickers: Record<string, [string | null, HistoryGroup, number | null, string | null, 0 | 1]>;
}

const LETTER_KIND: Record<string, HistoryKind> = { f: "fish", s: "smile", m: "mfi" };

/** Client-side expansion of the compact payload. */
export function expandSignalHistory(p: SignalHistoryPayload): SignalHistoryRow[] {
  return p.rows.map(([date, ticker, kinds, price]) => {
    const m = p.tickers[ticker] ?? [null, "stock", null, null, 0];
    return {
      id: `${date}|${ticker}`,
      date,
      ticker,
      name: m[0],
      group: m[1],
      kinds: [...kinds].map((c) => LETTER_KIND[c]).filter(Boolean),
      priceAtSignal: price,
      priceNow: m[2],
      priceNowAsOf: m[3],
      removed: m[4] === 1,
    };
  });
}
