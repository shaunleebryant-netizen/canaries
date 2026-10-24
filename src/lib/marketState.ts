/**
 * Weekly Market State (owner Pine, weekly bars) + Monthly 20MA loaders.
 * Data: data/market-state.json (scripts/scan-market-state.mjs) and
 * data/monthly-20ma-alerts.json (scripts/scan-monthly-20ma.mjs).
 * Never invent rows; empty is OK.
 */

import marketStateJson from "../../data/market-state.json";
import monthly20Json from "../../data/monthly-20ma-alerts.json";

export type MarketStateKind = "bull" | "bear" | "down";

export interface MarketStateRow {
  ticker: string;
  state: MarketStateKind;
  weeksInState: number;
  historyCapped?: boolean;
  prevState?: MarketStateKind | null;
  sinceWeek?: string;
  weekOf?: string;
  asOf?: string;
  close?: number | null;
}

export interface MarketStateMeta {
  asOf: string | null;
  weekOf: string | null;
  scannedCount: number | null;
  universeCount: number | null;
  failedCount: number;
  counts: { bull: number; bear: number; down: number } | null;
}

/** "Newly turned" window: weeksInState ≤ this many weekly bars. */
export const WEEKLY_STATE_MAX_WEEKS = 3;

type MarketStateFile = {
  asOf?: string;
  weekOf?: string;
  scannedCount?: number;
  universeCount?: number;
  failed?: string[];
  counts?: { bull: number; bear: number; down: number };
  states?: unknown[];
};

function isRow(r: unknown): r is MarketStateRow {
  if (!r || typeof r !== "object") return false;
  const x = r as MarketStateRow;
  return (
    typeof x.ticker === "string" &&
    (x.state === "bull" || x.state === "bear" || x.state === "down") &&
    typeof x.weeksInState === "number" &&
    x.weeksInState >= 1
  );
}

export function loadMarketStates(): MarketStateRow[] {
  const raw = marketStateJson as MarketStateFile;
  return Array.isArray(raw?.states) ? raw.states.filter(isRow) : [];
}

export function loadMarketStateMeta(): MarketStateMeta {
  const raw = marketStateJson as MarketStateFile;
  return {
    asOf: typeof raw?.asOf === "string" ? raw.asOf : null,
    weekOf: typeof raw?.weekOf === "string" ? raw.weekOf : null,
    scannedCount: typeof raw?.scannedCount === "number" ? raw.scannedCount : null,
    universeCount: typeof raw?.universeCount === "number" ? raw.universeCount : null,
    failedCount: Array.isArray(raw?.failed) ? raw.failed.length : 0,
    counts: raw?.counts ?? null,
  };
}

/** Dots shown for a newly-turned row: min(weeksInState, 3). */
export function stateDots(weeks: number): number {
  return Math.max(1, Math.min(weeks, WEEKLY_STATE_MAX_WEEKS));
}

/**
 * Weekly State box: bull / bear rows with weeksInState ≤ 3.
 * Each side ordered 3 dots → 2 → 1 (more-established first), then ticker.
 */
export function computeWeeklyStateTurns(rows: MarketStateRow[]): {
  bulls: MarketStateRow[];
  bears: MarketStateRow[];
} {
  const pick = (kind: MarketStateKind) =>
    rows
      .filter((r) => r.state === kind && r.weeksInState <= WEEKLY_STATE_MAX_WEEKS)
      .sort(
        (a, b) =>
          b.weeksInState - a.weeksInState || a.ticker.localeCompare(b.ticker)
      );
  return { bulls: pick("bull"), bears: pick("bear") };
}

/**
 * Multi-week Warriors (ex Bullish & Strong): weekly bull rows, weeksInState desc.
 * When aboveMonth20 is provided, keep only tickers currently above the 20-month MA
 * (owner 2026-10-02). Empty above set → empty list (never invent membership).
 * Omit aboveMonth20 only for callers that intentionally skip the gate.
 */
export function computeBullishStrong(
  rows: MarketStateRow[],
  aboveMonth20?: ReadonlySet<string> | readonly string[] | null
): MarketStateRow[] {
  const above =
    aboveMonth20 == null
      ? null
      : aboveMonth20 instanceof Set
        ? aboveMonth20
        : new Set(aboveMonth20);
  return rows
    .filter((r) => r.state === "bull" && (above == null || above.has(r.ticker)))
    .sort(
      (a, b) =>
        b.weeksInState - a.weeksInState || a.ticker.localeCompare(b.ticker)
    );
}

export interface Monthly20Signal {
  ticker: string;
  cross: "this_month" | "last_month";
  month?: string;
  asOf?: string;
  close: number;
  sma20: number;
  pctAbove: number;
  prevClose?: number;
  prevSma20?: number;
}

type Monthly20File = {
  asOf?: string;
  month?: string;
  scannedCount?: number;
  universeCount?: number;
  failed?: string[];
  signals?: unknown[];
  /** Tickers currently close > 20-month SMA (from same Yahoo 1mo scan). */
  aboveSma20?: unknown[];
};

function isMonthly(r: unknown): r is Monthly20Signal {
  if (!r || typeof r !== "object") return false;
  const x = r as Monthly20Signal;
  return (
    typeof x.ticker === "string" &&
    (x.cross === "this_month" || x.cross === "last_month") &&
    typeof x.close === "number" &&
    typeof x.sma20 === "number" &&
    typeof x.pctAbove === "number"
  );
}

export function loadMonthly20Signals(): Monthly20Signal[] {
  const raw = monthly20Json as Monthly20File;
  return Array.isArray(raw?.signals) ? raw.signals.filter(isMonthly) : [];
}

/**
 * Tickers currently above the 20-month SMA (monthly-20ma-alerts.json `aboveSma20`).
 * Returns null when the pack lacks that field (pre-gate packs → skip filter).
 * Returns a Set (possibly empty) when the field is present — empty means no
 * Multi-week Warriors rows (never invent membership).
 */
export function loadMonthly20AboveTickers(): Set<string> | null {
  const raw = monthly20Json as Monthly20File;
  if (!Array.isArray(raw?.aboveSma20)) return null;
  const out = new Set<string>();
  for (const row of raw.aboveSma20) {
    if (typeof row === "string" && row.trim()) {
      out.add(row.trim());
      continue;
    }
    if (row && typeof row === "object") {
      const t = (row as { ticker?: unknown }).ticker;
      if (typeof t === "string" && t.trim()) out.add(t.trim());
    }
  }
  return out;
}

export function loadMonthly20Meta(): {
  asOf: string | null;
  month: string | null;
  scannedCount: number | null;
  failedCount: number;
} {
  const raw = monthly20Json as Monthly20File;
  return {
    asOf: typeof raw?.asOf === "string" ? raw.asOf : null,
    month: typeof raw?.month === "string" ? raw.month : null,
    scannedCount: typeof raw?.scannedCount === "number" ? raw.scannedCount : null,
    failedCount: Array.isArray(raw?.failed) ? raw.failed.length : 0,
  };
}
