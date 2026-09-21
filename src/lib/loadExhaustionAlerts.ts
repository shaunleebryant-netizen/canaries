/**
 * Exhaustion alerts — 🥵 from Top Warning (RSI cross 80, EMA13>EMA55).
 * Never invent signals; empty = no hits in latest scan window.
 */

import exhaustionJson from "../../data/exhaustion-alerts.json";

export type ExhaustionSignal = "exhaustion";

export interface ExhaustionAlert {
  ticker: string;
  signal: ExhaustionSignal;
  asOf: string;
  note?: string;
}

type ExhaustionFile =
  | ExhaustionAlert[]
  | {
      asOf?: string | null;
      signals?: ExhaustionAlert[];
      note?: string;
      method?: string;
      scannedCount?: number;
      universeCount?: number;
    };

function isAlert(row: unknown): row is ExhaustionAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as ExhaustionAlert;
  return (
    typeof r.ticker === "string" &&
    r.signal === "exhaustion" &&
    typeof r.asOf === "string"
  );
}

export function loadExhaustionAlerts(): ExhaustionAlert[] {
  const raw = exhaustionJson as ExhaustionFile;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signals)
      ? raw.signals
      : [];
  return rows.filter(isAlert);
}

/** Optional scan meta for UI. */
export function loadExhaustionAlertsMeta(): {
  asOf: string | null;
  method: string | null;
  note: string | null;
  scannedCount: number | null;
  universeCount: number | null;
} {
  const raw = exhaustionJson as ExhaustionFile;
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
