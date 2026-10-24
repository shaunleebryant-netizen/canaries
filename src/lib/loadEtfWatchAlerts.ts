/**
 * ETF Watch alerts — 🙂/🐟 and/or 🥵/💀 from Canary RelRSI (daily)
 * on the ETF/index/metals/uranium universe (etf-watch-universe.json).
 * Never invent signals; empty = no hits in latest scan window.
 */

import etfJson from "../../data/etf-watch-alerts.json";
import etfUniverse from "../../data/etf-watch-universe.json";

/** Only show funds still in the Sector ETFs list (owner t697u: XAUUSD/XAGUSD dropped), even from a held file. */
const IN_UNIVERSE = new Set<string>((etfUniverse as { tickers: string[] }).tickers);

export type EtfWatchKind = "smile" | "fish" | "exhaustion" | "skull";

export interface EtfWatchAlert {
  ticker: string;
  /** Which Canary RelRSI kinds fired in the recent window. */
  signals: EtfWatchKind[];
  asOf: string;
  note?: string;
  timeframe?: string;
}

type EtfWatchFile =
  | EtfWatchAlert[]
  | {
      asOf?: string | null;
      scannedAt?: string | null;
      signals?: EtfWatchAlert[];
      note?: string;
      method?: string;
      scannedCount?: number;
      universeCount?: number;
      failed?: string[];
    };

const KINDS = new Set<EtfWatchKind>([
  "smile",
  "fish",
  "exhaustion",
  "skull",
]);

function isAlert(row: unknown): row is EtfWatchAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as EtfWatchAlert;
  return (
    typeof r.ticker === "string" &&
    typeof r.asOf === "string" &&
    Array.isArray(r.signals) &&
    r.signals.length > 0 &&
    r.signals.every((s) => KINDS.has(s as EtfWatchKind))
  );
}

export function loadEtfWatchAlerts(): EtfWatchAlert[] {
  const raw = etfJson as EtfWatchFile;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signals)
      ? raw.signals
      : [];
  return rows.filter(isAlert).filter((r) => IN_UNIVERSE.has(r.ticker));
}

/** Optional scan meta for UI. */
export function loadEtfWatchAlertsMeta(): {
  asOf: string | null;
  method: string | null;
  note: string | null;
  scannedCount: number | null;
  universeCount: number | null;
} {
  const raw = etfJson as EtfWatchFile;
  if (Array.isArray(raw)) {
    return {
      asOf: null,
      method: null,
      note: null,
      scannedCount: raw.length,
      universeCount: null,
    };
  }
  return {
    asOf: typeof raw.asOf === "string" ? raw.asOf : null,
    method: typeof raw.method === "string" ? raw.method : null,
    note: typeof raw.note === "string" ? raw.note : null,
    scannedCount:
      typeof raw.scannedCount === "number"
        ? raw.scannedCount
        : Array.isArray(raw.signals)
          ? raw.signals.length
          : null,
    universeCount:
      typeof raw.universeCount === "number" ? raw.universeCount : null,
  };
}
