/**
 * Past insider buys (3 months) — owner 2026-10-10, members Insiders tab only (never public).
 * Built nightly by scripts/scan-insider-buying.mjs (data/insider-history.json): every qualifying
 * open-market buy (universe, code P, not 10b5-1, >= $25k per insider buy) in the last 90 days,
 * re-priced from the pack's closes. Education only; past buys don't predict returns.
 */
import historyJson from "../../data/insider-history.json";

export interface InsiderHistoryRow {
  ticker: string;
  name: string;
  roles: string[];
  txnDate: string;
  filingDate: string;
  shares: number;
  avgPrice: number;
  usd: number;
  url: string;
  closeOnTradeDate: number | null;
  /** "avg" = insider's average price; "close" = trade-date close (Form 4 in another share class/unit). */
  priceBasis: "avg" | "close" | "unknown";
  priceAtBuy: number | null;
  lastClose: number | null;
  lastCloseDate: string | null;
  pctSince: number | null;
}

type HistoryFile = { asOf?: string | null; windowStart?: string | null; days?: number; buys?: unknown[] };

function isRow(r: unknown): r is InsiderHistoryRow {
  if (!r || typeof r !== "object") return false;
  const x = r as InsiderHistoryRow;
  return typeof x.ticker === "string" && typeof x.txnDate === "string" && typeof x.usd === "number";
}

export function loadInsiderHistory(): {
  asOf: string | null;
  windowStart: string | null;
  days: number;
  rows: InsiderHistoryRow[];
} {
  const raw = historyJson as HistoryFile;
  const rows = (Array.isArray(raw?.buys) ? raw.buys : []).filter(isRow).map((r) => ({
    ...r,
    roles: Array.isArray(r.roles) ? r.roles : [],
    priceBasis: r.priceBasis ?? "avg",
    priceAtBuy: r.priceAtBuy ?? null,
    closeOnTradeDate: r.closeOnTradeDate ?? null,
    lastClose: r.lastClose ?? null,
    lastCloseDate: r.lastCloseDate ?? null,
    pctSince: typeof r.pctSince === "number" ? r.pctSince : null,
  }));
  rows.sort((a, b) => (a.txnDate !== b.txnDate ? (a.txnDate < b.txnDate ? 1 : -1) : b.usd - a.usd));
  return {
    asOf: typeof raw?.asOf === "string" ? raw.asOf : null,
    windowStart: typeof raw?.windowStart === "string" ? raw.windowStart : null,
    days: typeof raw?.days === "number" ? raw.days : 90,
    rows,
  };
}
