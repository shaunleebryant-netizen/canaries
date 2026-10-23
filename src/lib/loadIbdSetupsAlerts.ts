/**
 * IBD Setups — latest daily Minervini + IBD-style RS (vs SPY) full PASS prints.
 * Education only. Never invent signals.
 */

import ibdSetupsJson from "../../data/ibd-setups-alerts.json";

export interface IbdSetupAlert {
  ticker: string;
  asOf: string;
  rsRating?: number;
  pctBelowHigh?: number;
  pctAboveLow?: number;
  note?: string;
  timeframe?: string;
}

type IbdSetupsFile =
  | IbdSetupAlert[]
  | {
      asOf?: string | null;
      signals?: IbdSetupAlert[];
      note?: string;
      method?: string;
      scannedCount?: number;
      universeCount?: number;
    };

function isAlert(row: unknown): row is IbdSetupAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as IbdSetupAlert;
  return typeof r.ticker === "string" && typeof r.asOf === "string";
}

export function loadIbdSetupsAlerts(): IbdSetupAlert[] {
  const raw = ibdSetupsJson as IbdSetupsFile;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signals)
      ? raw.signals
      : [];
  return rows.filter(isAlert);
}

/** Optional scan meta for UI. */
export function loadIbdSetupsAlertsMeta(): {
  asOf: string | null;
  method: string | null;
  note: string | null;
  scannedCount: number | null;
  universeCount: number | null;
} {
  const raw = ibdSetupsJson as IbdSetupsFile;
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
