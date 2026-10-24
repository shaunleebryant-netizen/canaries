/**
 * Crypto Watch alerts — 🙂/🐟 and/or 🥵/💀 from Canary RelRSI (daily)
 * on the crypto spot + related-products universe (crypto-watch-universe.json).
 * Never invent signals; empty = no hits in latest scan window.
 */

import cryptoJson from "../../data/crypto-watch-alerts.json";

export type CryptoWatchKind = "smile" | "fish" | "exhaustion" | "skull";

export interface CryptoWatchAlert {
  ticker: string;
  /** Which Canary RelRSI kinds fired in the recent window. */
  signals: CryptoWatchKind[];
  asOf: string;
  note?: string;
  timeframe?: string;
}

type CryptoWatchFile =
  | CryptoWatchAlert[]
  | {
      asOf?: string | null;
      scannedAt?: string | null;
      signals?: CryptoWatchAlert[];
      note?: string;
      method?: string;
      scannedCount?: number;
      universeCount?: number;
      failed?: string[];
    };

const KINDS = new Set<CryptoWatchKind>([
  "smile",
  "fish",
  "exhaustion",
  "skull",
]);

function isAlert(row: unknown): row is CryptoWatchAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as CryptoWatchAlert;
  return (
    typeof r.ticker === "string" &&
    typeof r.asOf === "string" &&
    Array.isArray(r.signals) &&
    r.signals.length > 0 &&
    r.signals.every((s) => KINDS.has(s as CryptoWatchKind))
  );
}

export function loadCryptoWatchAlerts(): CryptoWatchAlert[] {
  const raw = cryptoJson as CryptoWatchFile;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signals)
      ? raw.signals
      : [];
  return rows.filter(isAlert);
}

/** Optional scan meta for UI. */
export function loadCryptoWatchAlertsMeta(): {
  asOf: string | null;
  method: string | null;
  note: string | null;
  scannedCount: number | null;
  universeCount: number | null;
} {
  const raw = cryptoJson as CryptoWatchFile;
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
