/**
 * Fundamentals for the Main Scanner columns (owner approved 2026-10-10) — members dashboard only.
 * Built nightly by scripts/build-fundamentals.mjs from SEC EDGAR company facts + the pack's closes.
 * Education only. Never invent values: missing stays null with a reason.
 */
import fundamentalsJson from "../../data/fundamentals.json";

/** Why a value is null: not meaningful, stale filing, missing tag, or not a company (ETF / crypto / metal). */
export type FundWhy = "nm" | "stale" | "missing" | "na" | null;

export interface FundRow {
  /** Last close (pack). */
  p: number | null;
  pe: number | null;
  pw: FundWhy;
  /** EPS growth y/y as a fraction (0.25 = +25%). */
  g: number | null;
  gw: FundWhy;
  ev: number | null;
  evw: FundWhy;
  /** 1 = annual-only filer (internal; not shown to members). */
  a?: number;
  /** Latest fiscal period end used. */
  fe?: string;
  /** Plain notes (currency, ADR, fallbacks, missing reason). */
  n?: string;
  /** Non-company kind (etf, crypto, ...). */
  k?: string;
}

interface FundFile {
  asOf?: string;
  tickers?: Record<string, FundRow>;
}

const raw = fundamentalsJson as unknown as FundFile;

export function loadFundamentalsAsOf(): string | null {
  return typeof raw?.asOf === "string" ? raw.asOf : null;
}

/** Only the rows the page needs (keeps the client payload small). */
export function pickFundamentals(tickers: string[]): Record<string, FundRow> {
  const all = raw?.tickers ?? {};
  const out: Record<string, FundRow> = {};
  for (const t of tickers) if (all[t]) out[t] = all[t];
  return out;
}
