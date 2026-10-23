/**
 * Growth Score (owner approved 2026-10-10; flag MEMBERS_GROWTH_SCORE) — members dashboard only.
 * Built nightly by scripts/build-fundamentals.mjs into data/growth-score.json from SEC EDGAR company
 * facts. Education only. Never invent values: missing stays null with a reason.
 */
import growthJson from "../../data/growth-score.json";

export type GrowthPart = "rev" | "gm" | "evs" | "run" | "path";

export interface GrowthRow {
  /** Growth Score 0–100 (null = not scored, see why). */
  gs: number | null;
  why?: string;
  /** 1 = under 60% of the weight available (greyed, not ranked). */
  pt?: number;
  /** Share of the weight available (%). */
  cov?: number;
  miss?: GrowthPart[];
  /** 1 = Danger. */
  d?: number;
  dw?: string[];
  /** Sub-scores 0–100 per part. */
  s?: Record<GrowthPart, number | null>;
  /** Revenue growth y/y (12 months) and latest quarter y/y, fractions. */
  rg?: number | null;
  qg?: number | null;
  tiny?: number;
  an?: number;
  /** Gross margin (fraction) and its change vs a year ago (pp). */
  gm?: number | null;
  gmd?: number | null;
  /** EV/Sales, peer median, peer group label, ratio to peers. */
  evs?: number | null;
  pm?: number | null;
  pg?: string | null;
  rel?: number | null;
  /** Months of runway, or "cash+" when free cash flow is positive. */
  run?: number | "cash+" | null;
  fcfm?: number | null;
  om?: number | null;
  omd?: number | null;
  n?: string;
}

export interface GrowthRankRow extends GrowthRow {
  t: string;
}

interface GrowthFile {
  asOf?: string;
  ranked?: string[];
  counts?: { ranked?: number };
  tickers?: Record<string, GrowthRow>;
}

const raw = growthJson as unknown as GrowthFile;

export function loadGrowthAsOf(): string | null {
  return typeof raw?.asOf === "string" ? raw.asOf : null;
}

/** Only the rows the page needs. */
export function pickGrowth(tickers: string[]): Record<string, GrowthRow> {
  const all = raw?.tickers ?? {};
  const out: Record<string, GrowthRow> = {};
  for (const t of tickers) if (all[t]) out[t] = all[t];
  return out;
}

/** Ranked stocks (best first), partial rows excluded. */
export function loadGrowthRanking(): GrowthRankRow[] {
  const all = raw?.tickers ?? {};
  return (raw?.ranked ?? []).filter((t) => all[t]?.gs != null).map((t) => ({ t, ...all[t] }));
}
