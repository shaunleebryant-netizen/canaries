/**
 * Insider Buying sub scanner (owner approved 2026-10-09, t595u) — members dashboard only, never
 * the public homepage. Built nightly by scripts/scan-insider-buying.mjs from SEC Form 4 filings.
 * Not a Bullish Setups condition. Education only. Never invent signals.
 */
import insiderJson from "../../data/insider-buying.json";

export interface InsiderBuyingSignal {
  ticker: string;
  totalUsd: number;
  insiders: number;
  roleTag: string;
  roles: string[];
  latestTxnDate: string;
  latestFilingDate?: string;
  buyers?: { name: string; roles: string[]; usd: number }[];
  /** One row per buy (insider + trade date), newest first (owner 2026-10-10; older files lack it). */
  trades?: InsiderTrade[];
}

export interface InsiderTrade {
  name: string;
  roles: string[];
  txnDate: string;
  filingDate: string;
  shares: number;
  avgPrice: number;
  usd: number;
  /** SEC EDGAR filing index for the Form 4. */
  url: string;
}

type InsiderFile = { asOf?: string | null; signals?: unknown[] };

function isSignal(row: unknown): row is InsiderBuyingSignal {
  if (!row || typeof row !== "object") return false;
  const r = row as InsiderBuyingSignal;
  return (
    typeof r.ticker === "string" &&
    typeof r.totalUsd === "number" &&
    typeof r.insiders === "number" &&
    typeof r.latestTxnDate === "string"
  );
}

export function loadInsiderBuying(): { asOf: string | null; signals: InsiderBuyingSignal[] } {
  const raw = insiderJson as InsiderFile;
  const signals = (Array.isArray(raw?.signals) ? raw.signals : []).filter(isSignal);
  signals.sort((a, b) => b.totalUsd - a.totalUsd || a.ticker.localeCompare(b.ticker));
  return { asOf: typeof raw?.asOf === "string" ? raw.asOf : null, signals };
}
