/**
 * Bullish Engulfing sub scanner — recent bodies-only hits on completed
 * daily bars (last 5 sessions) and weekly bars (last 3 weeks).
 * Education only. Never invent signals. Empty until the scan has run.
 */

import engulfingJson from "../../data/engulfing-alerts.json";

export interface EngulfingHit {
  ticker: string;
  asOf: string;
  barsSince: number;
  close: number;
  pctFromClose: number;
  bodyRatio: number;
  timeframe: "1D" | "1W";
}

export interface EngulfingData {
  /** Last completed daily session, or null when the scan has not run. */
  asOf: string | null;
  /** Friday of the last completed week. */
  weeklyAsOf: string | null;
  method: string | null;
  note: string | null;
  dailySessions: string[];
  weeklySessions: string[];
  daily: EngulfingHit[];
  weekly: EngulfingHit[];
}

/** What Bullish Setups reads: dates only, plus the session calendars. */
export interface EngulfingSetupsInput {
  daily: { ticker: string; asOf: string }[];
  weekly: { ticker: string; asOf: string }[];
  dailySessions: string[];
  weeklySessions: string[];
}

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function asYmd(x: unknown): string | null {
  return typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : null;
}

function hit(row: unknown, timeframe: "1D" | "1W"): EngulfingHit | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const asOf = asYmd(r.asOf);
  const close = num(r.close);
  const pct = num(r.pctFromClose);
  const ratio = num(r.bodyRatio);
  const bars = num(r.barsSince);
  if (typeof r.ticker !== "string" || !asOf || close == null || pct == null || ratio == null || bars == null) {
    return null;
  }
  return {
    ticker: r.ticker.trim().toUpperCase(),
    asOf,
    barsSince: bars,
    close,
    pctFromClose: pct,
    bodyRatio: ratio,
    timeframe,
  };
}

function sessions(raw: Record<string, unknown>, key: string): string[] {
  const xs = raw[key];
  if (!Array.isArray(xs)) return [];
  return xs.map(asYmd).filter((d): d is string => Boolean(d));
}

export function loadEngulfing(): EngulfingData {
  const raw = (engulfingJson ?? {}) as Record<string, unknown>;
  const asOfObj =
    raw.asOf && typeof raw.asOf === "object" ? (raw.asOf as Record<string, unknown>) : null;
  const asOf = asOfObj ? asYmd(asOfObj.daily) : asYmd(raw.asOf);
  const weeklyAsOf = asOfObj ? asYmd(asOfObj.weekly) : asYmd(raw.weeklyAsOf);
  const rows = (key: "daily" | "weekly", timeframe: "1D" | "1W") =>
    (Array.isArray(raw[key]) ? raw[key] : [])
      .map((row) => hit(row, timeframe))
      .filter((row): row is EngulfingHit => row != null);
  return {
    asOf,
    weeklyAsOf,
    method: typeof raw.method === "string" ? raw.method : null,
    note: typeof raw.note === "string" ? raw.note : null,
    dailySessions: sessions(raw, "dailySessions"),
    weeklySessions: sessions(raw, "weeklySessions"),
    daily: rows("daily", "1D"),
    weekly: rows("weekly", "1W"),
  };
}

export function engulfingForSetups(data: EngulfingData): EngulfingSetupsInput {
  const slim = (rows: EngulfingHit[]) => rows.map((r) => ({ ticker: r.ticker, asOf: r.asOf }));
  return {
    daily: slim(data.daily),
    weekly: slim(data.weekly),
    dailySessions: data.dailySessions,
    weeklySessions: data.weeklySessions,
  };
}
