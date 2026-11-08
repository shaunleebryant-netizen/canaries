/**
 * New Highs / New Lows — fresh daily-close extremes on the Canary universe.
 * Written by scripts/scan-new-highs-lows.mjs. Education only. Never invent rows.
 */
import json from "../../data/new-highs-lows.json";

export type ExtremeKind = "ATH" | "ATL" | "2Y" | "1Y" | "sinceIpo";
export interface ExtremeRow {
  ticker: string;
  name?: string | null;
  kind: ExtremeKind;
  close: number;
  priorExtreme: number;
  priorExtremeDate: string;
  pctVsPrior: number;
  sessionsSincePrior: number;
  asOf: string;
}
type File = { asOf?: string | null; highs?: ExtremeRow[]; lows?: ExtremeRow[]; recentHighs?: RecentHigh[] };
export interface RecentHigh { ticker: string; kind: string; asOf: string; close?: number; pctVsPrior?: number }


const ok = (r: unknown): r is ExtremeRow =>
  !!r && typeof (r as ExtremeRow).ticker === "string" && typeof (r as ExtremeRow).asOf === "string";

export function loadNewHighsLows(): { asOf: string | null; highs: ExtremeRow[]; lows: ExtremeRow[] } {
  const f = json as unknown as File;
  return {
    asOf: f?.asOf ?? null,
    highs: (f?.highs ?? []).filter(ok),
    lows: (f?.lows ?? []).filter(ok),
  };
}
