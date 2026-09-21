/**
 * Volume Advancers vs Decliners (TradingView-style).
 * Ratio = (UVOL − DVOL) / (UVOL + DVOL), then EMA13 / EMA34.
 * Never invent prints — missing Yahoo UVOL/DVOL → PENDING stub.
 */

import { fetchDailyCloses, type YahooBar } from "./yahooFinance";
import stubJson from "../../data/volume-breadth-stub.json";

export type VolumeBreadthRegime =
  | "RISK_ON"
  | "RISK_OFF"
  | "NO_REGIME"
  | "PENDING";

export interface VolumeBreadthPoint {
  date: string;
  ratio: number;
  ema13: number | null;
  ema34: number | null;
}

export interface VolumeBreadthResult {
  asOf: string | null;
  status: "VERIFIED" | "PARTIAL" | "PENDING";
  pendingReason?: string;
  /** Tried Yahoo symbols (documented). */
  symbolsTried: string[];
  ratio: number | null;
  ema13: number | null;
  ema34: number | null;
  regime: VolumeBreadthRegime;
  oneLiner: string;
  history: VolumeBreadthPoint[];
  draft: boolean;
}

/** Classic EMA; needs at least `period` samples. */
export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i]! * k + e * (1 - k);
  }
  return e;
}

/** Running EMA series aligned to input (null until warm). */
export function emaSeries(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = [];
  if (values.length < period) {
    for (let i = 0; i < values.length; i++) out.push(null);
    return out;
  }
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period - 1; i++) out.push(null);
  out.push(e);
  for (let i = period; i < values.length; i++) {
    e = values[i]! * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

export function volumeRatio(uvol: number, dvol: number): number | null {
  const den = uvol + dvol;
  if (!Number.isFinite(uvol) || !Number.isFinite(dvol) || den === 0) return null;
  return (uvol - dvol) / den;
}

/**
 * Classify from latest ratio + EMAs.
 * - Above 0 and 13 > 34 = real risk-on volume
 * - Below 0 and 13 < 34 = real risk-off volume
 * - Cross near 0 with a flat 34 = no regime, ignore
 */
export function classifyVolumeRegime(
  ratio: number | null,
  ema13: number | null,
  ema34: number | null,
  priorEma34?: number | null
): VolumeBreadthRegime {
  if (ratio == null || ema13 == null || ema34 == null) return "PENDING";

  const nearZero = Math.abs(ratio) < 0.05;
  const flat34 =
    priorEma34 != null && Math.abs(ema34 - priorEma34) < 0.01;

  if (nearZero && (flat34 || Math.abs(ema13 - ema34) < 0.02)) {
    return "NO_REGIME";
  }
  if (ratio > 0 && ema13 > ema34) return "RISK_ON";
  if (ratio < 0 && ema13 < ema34) return "RISK_OFF";
  return "NO_REGIME";
}

export function computeFromPairs(
  pairs: Array<{ date: string; uvol: number; dvol: number }>
): Omit<VolumeBreadthResult, "symbolsTried" | "draft" | "pendingReason"> {
  const ratios: number[] = [];
  const dates: string[] = [];
  for (const p of pairs) {
    const r = volumeRatio(p.uvol, p.dvol);
    if (r == null) continue;
    ratios.push(r);
    dates.push(p.date);
  }

  const e13 = emaSeries(ratios, 13);
  const e34 = emaSeries(ratios, 34);
  const history: VolumeBreadthPoint[] = dates.map((date, i) => ({
    date,
    ratio: ratios[i]!,
    ema13: e13[i] ?? null,
    ema34: e34[i] ?? null,
  }));

  const last = history[history.length - 1];
  const prior = history[history.length - 2];
  const ratio = last?.ratio ?? null;
  const ema13 = last?.ema13 ?? null;
  const ema34 = last?.ema34 ?? null;
  const regime = classifyVolumeRegime(
    ratio,
    ema13,
    ema34,
    prior?.ema34 ?? null
  );

  let oneLiner: string;
  if (regime === "PENDING") {
    oneLiner = "Volume breadth pending — no UVOL/DVOL prints yet.";
  } else if (regime === "RISK_ON") {
    oneLiner =
      "Ratio above 0 with 13 EMA above 34 — real risk-on volume.";
  } else if (regime === "RISK_OFF") {
    oneLiner =
      "Ratio below 0 with 13 EMA below 34 — real risk-off volume.";
  } else {
    oneLiner =
      "Cross near 0 or flat 34 — no clear volume regime; ignore.";
  }

  return {
    asOf: last?.date ?? null,
    status: last ? "VERIFIED" : "PENDING",
    ratio,
    ema13,
    ema34,
    regime,
    oneLiner,
    history,
  };
}

/** Candidate Yahoo symbols for NYSE up/down volume (often unavailable). */
export const UVOL_CANDIDATES = ["^UVOL", "UVOL"] as const;
export const DVOL_CANDIDATES = ["^DVOL", "DVOL"] as const;

function alignBars(
  u: YahooBar[],
  d: YahooBar[]
): Array<{ date: string; uvol: number; dvol: number }> {
  const dMap = new Map(d.map((b) => [b.date, b.close]));
  const out: Array<{ date: string; uvol: number; dvol: number }> = [];
  for (const b of u) {
    const dv = dMap.get(b.date);
    if (dv == null) continue;
    // Sanity: true volume indices are large; ETF ~$35 is not UVOL/DVOL.
    if (b.close < 1000 || dv < 1000) continue;
    out.push({ date: b.date, uvol: b.close, dvol: dv });
  }
  return out;
}

async function tryFetchFirst(
  symbols: readonly string[]
): Promise<{ symbol: string; bars: YahooBar[] } | { error: string; tried: string[] }> {
  const tried: string[] = [];
  for (const symbol of symbols) {
    tried.push(symbol);
    const got = await fetchDailyCloses(symbol, { range: "6mo", lastN: 120 });
    if ("bars" in got && got.bars.length > 0) {
      return { symbol, bars: got.bars };
    }
  }
  return { error: "no chart result", tried };
}

export function pendingResult(reason: string, tried: string[]): VolumeBreadthResult {
  return {
    asOf: null,
    status: "PENDING",
    pendingReason: reason,
    symbolsTried: tried,
    ratio: null,
    ema13: null,
    ema34: null,
    regime: "PENDING",
    oneLiner: "Volume breadth pending — NYSE UVOL/DVOL not available from Yahoo yet.",
    history: [],
    draft: true,
  };
}

/**
 * Soft-fail live load. If Yahoo symbols missing or look like wrong instruments,
 * return PENDING (never invent).
 */

type StubFile = {
  draft?: boolean;
  status?: string;
  asOf?: string | null;
  asOfNote?: string;
  ratio?: number | null;
  ema13?: number | null;
  ema34?: number | null;
  regime?: VolumeBreadthRegime;
  oneLiner?: string;
  uvol?: number | null;
  dvol?: number | null;
  history?: Array<{
    date: string;
    ratio: number;
    ema13?: number | null;
    ema34?: number | null;
    uvol?: number;
    dvol?: number;
  }>;
  note?: string;
  symbolsTried?: string[];
};

/** Prefer TradingView-backed stub when Yahoo cannot serve NYSE UVOL/DVOL. */
export function loadVolumeBreadthFromStub(
  yahooTried: string[] = []
): VolumeBreadthResult {
  const st = stubJson as StubFile;
  const ratio = typeof st.ratio === "number" ? st.ratio : null;
  const ema13 = typeof st.ema13 === "number" ? st.ema13 : null;
  const ema34 = typeof st.ema34 === "number" ? st.ema34 : null;
  const history = (st.history ?? []).map((h) => ({
    date: h.date,
    ratio: h.ratio,
    ema13: h.ema13 ?? null,
    ema34: h.ema34 ?? null,
  }));
  const regime =
    (st.regime as VolumeBreadthRegime | undefined) ??
    classifyVolumeRegime(ratio, ema13, ema34);
  const status: VolumeBreadthResult["status"] =
    ratio != null && ema13 != null && ema34 != null
      ? "VERIFIED"
      : ratio != null
        ? "PARTIAL"
        : "PENDING";
  const oneLiner =
    st.oneLiner ??
    (status === "PENDING"
      ? "Volume breadth pending — no UVOL/DVOL prints yet."
      : status === "PARTIAL"
        ? `Latest ratio ${ratio! >= 0 ? "+" : ""}${ratio!.toFixed(3)} from TradingView — EMA regime needs ~34 sessions of history.`
        : boardOneLinerSafe(regime));

  return {
    asOf: st.asOf ?? null,
    status,
    pendingReason:
      status === "PARTIAL"
        ? st.asOfNote ??
          "Ratio from TradingView USI:UVOL/USI:DVOL; EMA13/34 pending longer history."
        : status === "PENDING"
          ? st.note
          : undefined,
    symbolsTried: [...yahooTried, "USI:UVOL", "USI:DVOL"],
    ratio,
    ema13,
    ema34,
    regime: status === "VERIFIED" ? regime : "PENDING",
    oneLiner,
    history,
    draft: st.draft !== false && status !== "VERIFIED",
  };
}

function boardOneLinerSafe(regime: VolumeBreadthRegime): string {
  if (regime === "RISK_ON") return "Ratio above 0 with 13 EMA above 34 — real risk-on volume.";
  if (regime === "RISK_OFF") return "Ratio below 0 with 13 EMA below 34 — real risk-off volume.";
  if (regime === "NO_REGIME") return "Cross near 0 or flat 34 — no clear volume regime; ignore.";
  return "Volume breadth pending — no UVOL/DVOL prints yet.";
}

export async function loadVolumeBreadth(): Promise<VolumeBreadthResult> {
  const tried: string[] = [];
  try {
    const u = await tryFetchFirst(UVOL_CANDIDATES);
    if ("error" in u) {
      tried.push(...u.tried);
      return loadVolumeBreadthFromStub([...tried, ...u.tried]);
    }
    tried.push(u.symbol);

    const d = await tryFetchFirst(DVOL_CANDIDATES);
    if ("error" in d) {
      tried.push(...d.tried);
      return loadVolumeBreadthFromStub([...tried, ...d.tried]);
    }
    tried.push(d.symbol);

    // Reject known false positives: Yahoo ^DVOL/DVOL currently resolve to an ETF ~$35.
    const lastU = u.bars[u.bars.length - 1]?.close ?? 0;
    const lastD = d.bars[d.bars.length - 1]?.close ?? 0;
    if (lastU < 1000 || lastD < 1000) {
      return loadVolumeBreadthFromStub(tried);
    }

    const pairs = alignBars(u.bars, d.bars);
    if (pairs.length < 34) {
      return pendingResult(
        `Aligned UVOL/DVOL bars insufficient (${pairs.length} < 34 for EMA34).`,
        tried
      );
    }

    const computed = computeFromPairs(pairs);
    return { ...computed, symbolsTried: tried, draft: true };
  } catch (e) {
    return pendingResult(
      e instanceof Error ? e.message : String(e),
      tried
    );
  }
}
