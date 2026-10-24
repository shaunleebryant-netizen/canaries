/**
 * MFI Scan alerts — MFI Washout v6.1 (from the 2026-10-08 run; v6 before; scripts/scan-mfi-washout.mjs).
 * 💵 mfi_os = bottomSignal on the latest completed daily bar. mfi_ob (old ≥80 zone) is retired and
 * kept in the type only for older history rows. Never invent signals.
 */

import moneyFlowJson from "../../data/money-flow-alerts.json";

export type MoneyFlowSignal = "mfi_os" | "mfi_ob";

export interface MoneyFlowAlert {
  ticker: string;
  signal: MoneyFlowSignal;
  asOf: string;
  mfi?: number;
  note?: string;
  timeframe?: string;
}

type MoneyFlowFile =
  | MoneyFlowAlert[]
  | {
      asOf?: string | null;
      signals?: MoneyFlowAlert[];
      note?: string;
      method?: string;
      scannedCount?: number;
      universeCount?: number;
      prints?: MoneyFlowAlert[];
      sessionDates?: string[];
    };

function isAlert(row: unknown): row is MoneyFlowAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as MoneyFlowAlert;
  return (
    typeof r.ticker === "string" &&
    (r.signal === "mfi_os" || r.signal === "mfi_ob") &&
    typeof r.asOf === "string"
  );
}

export function loadMoneyFlowAlerts(): MoneyFlowAlert[] {
  const raw = moneyFlowJson as MoneyFlowFile;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signals)
      ? raw.signals
      : [];
  return rows.filter(isAlert);
}

/**
 * Every 💵 washout print within the scan's 14-calendar-day history window
 * (Main Scanner uses these so the 14-day rule is real). Falls back to the
 * current rows when the file predates print history.
 */
export function loadMoneyFlowPrints(): MoneyFlowAlert[] {
  const raw = moneyFlowJson as MoneyFlowFile;
  if (!Array.isArray(raw) && Array.isArray(raw?.prints)) {
    return raw.prints.filter(isAlert);
  }
  return loadMoneyFlowAlerts();
}

/** Trading-session calendar from the scan (Main Scanner "last 5 trading days" 💵 rule). */
export function loadMoneyFlowSessionDates(): string[] {
  const raw = moneyFlowJson as MoneyFlowFile;
  return !Array.isArray(raw) && Array.isArray(raw?.sessionDates) ? raw.sessionDates : [];
}

/** Optional scan meta for UI. */
export function loadMoneyFlowAlertsMeta(): {
  asOf: string | null;
  method: string | null;
  note: string | null;
  scannedCount: number | null;
  universeCount: number | null;
} {
  const raw = moneyFlowJson as MoneyFlowFile;
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
