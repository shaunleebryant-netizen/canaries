/**
 * Fish alerts watchlist — smile 🙂 / fish 🐟 from Canary RelRSI (daily).
 * Never invent signals; empty = awaiting universe + first scan.
 */

import fishJson from "../../data/fish-alerts.json";

export type FishSignal = "smile" | "fish" | "both";

export interface FishAlert {
  ticker: string;
  signal: FishSignal;
  asOf: string;
  note?: string;
  timeframe?: string;
}

type FishFile =
  | FishAlert[]
  | {
      asOf?: string | null;
      signals?: FishAlert[];
      note?: string;
      method?: string;
    };

function isAlert(row: unknown): row is FishAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as FishAlert;
  return (
    typeof r.ticker === "string" &&
    (r.signal === "smile" || r.signal === "fish" || r.signal === "both") &&
    typeof r.asOf === "string"
  );
}

export function loadFishAlerts(): FishAlert[] {
  const raw = fishJson as FishFile;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signals)
      ? raw.signals
      : [];
  return rows.filter(isAlert);
}

/** Optional scan meta for UI. */
export function loadFishAlertsMeta(): {
  asOf: string | null;
  method: string | null;
  note: string | null;
  scannedCount: number | null;
  universeCount: number | null;
} {
  const raw = fishJson as FishFile;
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
    scannedCount: Array.isArray(raw.signals) ? raw.signals.length : null,
    universeCount: null,
  };
}
