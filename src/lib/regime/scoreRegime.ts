/** UNUSED by members Market Regime stub — superseded by computeRegime.ts (canary-table SoT). Kept for reference; do not wire into /members. */
/**
 * Market Regime scoring — single source of truth for thresholds & weights.
 *
 * STRATEGIC SCORE INPUTS (daily close only; skip missing → mark degraded):
 *   +1.0  NDX above SMA20
 *   +1.0  NDX above SMA50
 *   +0.5  NDX above SMA10
 *   +1.0  SMH above SMA20
 *   +0.5  SMH above SMA10
 *   +0.5  SPX above SMA200
 *   +0.5  if NDX 3-day ROC > +1.5%;  -0.5 if < -1.5%
 *   +1.0  if % of SMH breadth proxy above SMA10 > 60%;  -1.0 if < 40%
 *   +1.0  if VIX < 16;  -1.0 if VIX > 22
 *   +0.5  if VIX < SMA10;  -0.5 if VIX > SMA10
 *   +1.0 / -1.0  VIX vs VIX3M proxy (contango / backwardation);
 *         (if either missing, skip and note degraded — VX futures not required)
 *   +0.5  if HYG above SMA10;  -0.5 if below
 *
 * STRATEGIC STATES (hysteresis):
 *   RISK-ON:      enter >= +4.5, exit only if score < +2.0
 *   NEUTRAL-PLUS: +2.0 to +4.4
 *   MIXED:        -0.5 to +1.9
 *   RISK-OFF:     enter <= -3.0, exit only if score > -0.5
 *   STRESS:       score <= -5.5 OR (VIX backwardation 2 closes AND VIX > 22)
 *
 * Require 2 consecutive closes before changing strategic state across a
 * threshold (previousState + pending flip). First draft / no history:
 * synthetic prior = current band unless history file exists.
 *
 * TACTICAL OVERLAY (no hysteresis except 2-day VIX curve):
 *   lighter score using 10-day trend, 3-day ROC, SMH 10-day breadth, VIX vs 10-day.
 *   Labels: FIRMING / FADING / STRESSING / STABLE
 *
 * SPEC SLEEVE (NOT in master score):
 *   equal-weight IONQ, QBTS, RGTI, QUBT vs QQQ, 5-day relative return.
 *   SPEC ON  if basket RS > +3% AND tactical not STRESSING AND strategic MIXED or better.
 *   SPEC OFF if basket RS < -3% OR tactical STRESSING OR strategic RISK-OFF/STRESS.
 *
 * SIZING HINTS:
 *   RISK-ON:      core 100% / spec 100%
 *   NEUTRAL-PLUS: core 100% / spec 50%
 *   MIXED:        core 70% / spec 25%
 *   RISK-OFF:     core 50% hedged / spec 0 new
 *   STRESS:       core 25–40% or hedged / spec flat
 *
 * SEMIS BREADTH PROXY (when SMH constituents unavailable):
 *   NVDA, AMD, AVGO, TSM, ASML, MU, AMAT, LRCX, KLAC, QCOM, MRVL, SNPS, CDNS, ARM, INTC
 */

export const SEMIS_BREADTH_PROXY = [
  "NVDA",
  "AMD",
  "AVGO",
  "TSM",
  "ASML",
  "MU",
  "AMAT",
  "LRCX",
  "KLAC",
  "QCOM",
  "MRVL",
  "SNPS",
  "CDNS",
  "ARM",
  "INTC",
] as const;

export const SPEC_TICKERS = ["IONQ", "QBTS", "RGTI", "QUBT"] as const;

export type StrategicState =
  | "RISK-ON"
  | "NEUTRAL-PLUS"
  | "MIXED"
  | "RISK-OFF"
  | "STRESS";

export type TacticalLabel = "FIRMING" | "FADING" | "STRESSING" | "STABLE";

export type LightStatus = "pass" | "fail" | "neutral" | "degraded";

export interface Contribution {
  id: string;
  label: string;
  value: number | null;
  contribution: number;
  raw?: string;
  status: LightStatus;
}

export interface RegimeInputs {
  /** Close series oldest → newest */
  ndx: number[];
  smh: number[];
  spx: number[];
  vix: number[];
  hyg: number[];
  qqq: number[];
  /** Per-ticker close series for breadth proxy */
  semis: Record<string, number[]>;
  /** Quantum names for SPEC */
  spec: Record<string, number[]>;
  /**
   * Preferred VIX term proxy: spot VIX series + VIX3M series (Yahoo ^VIX / ^VIX3M).
   * Score +1 if last VIX < last VIX3M (contango); −1 if inverted; degraded if missing.
   * Legacy optional futures fields kept unused.
   */
  vix3m?: number[];
  vixFront?: number[];
  vixSecond?: number[];
  /** Prior strategic state from history (optional) */
  previousState?: StrategicState | null;
  /** Pending flip candidate from prior session (optional) */
  pendingState?: StrategicState | null;
  pendingCount?: number;
}

export interface RegimeScoreResult {
  strategicScore: number;
  strategicState: StrategicState;
  tacticalLabel: TacticalLabel;
  tacticalScore: number;
  specOn: boolean;
  specRs5d: number | null;
  contributions: Contribution[];
  inputLights: Record<string, LightStatus>;
  degraded: string[];
  sizingHint: string;
  vixBackwardation2d: boolean;
  /** State machine bookkeeping for persistence */
  previousState: StrategicState;
  pendingState: StrategicState | null;
  pendingCount: number;
  raw: {
    ndx: number;
    ndxSma10: number | null;
    ndxSma20: number | null;
    ndxSma50: number | null;
    ndxRoc3: number | null;
    smh: number;
    smhSma10: number | null;
    smhSma20: number | null;
    spx: number;
    spxSma200: number | null;
    vix: number;
    vixSma10: number | null;
    smhBreadthPct: number | null;
    hyg: number;
    hygSma10: number | null;
  };
}

export const SIZING_HINTS: Record<StrategicState, string> = {
  "RISK-ON": "Core 100% / Spec 100%",
  "NEUTRAL-PLUS": "Core 100% / Spec 50%",
  MIXED: "Core 70% / Spec 25%",
  "RISK-OFF": "Core 50% hedged / Spec 0 new",
  STRESS: "Core 25–40% or hedged / Spec flat",
};

function sma(series: number[], n: number): number | null {
  if (series.length < n) return null;
  const slice = series.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

function roc(series: number[], days: number): number | null {
  if (series.length < days + 1) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 1 - days];
  if (prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

function last(series: number[]): number | null {
  return series.length ? series[series.length - 1] : null;
}

/** Band from raw score without hysteresis (for synthetic prior). */
export function bandFromScore(score: number, stressOverride: boolean): StrategicState {
  if (stressOverride || score <= -5.5) return "STRESS";
  if (score >= 4.5) return "RISK-ON";
  if (score >= 2.0) return "NEUTRAL-PLUS";
  if (score >= -0.5) return "MIXED";
  if (score <= -3.0) return "RISK-OFF";
  // Between -3.0 exclusive and -0.5 exclusive → treat as MIXED-adjacent RISK-OFF zone
  // Spec bands: MIXED -0.5..+1.9, RISK-OFF enter <= -3.0
  // Gap (-3.0, -0.5): map to RISK-OFF soft / MIXED — use MIXED per "to +1.9" floor
  return score < -0.5 ? "RISK-OFF" : "MIXED";
}

/**
 * Apply hysteresis + 2-close confirmation.
 * pendingState/pendingCount track a candidate flip awaiting second close.
 */
export function applyStrategicHysteresis(
  score: number,
  stressOverride: boolean,
  previousState: StrategicState | null | undefined,
  pendingState: StrategicState | null | undefined,
  pendingCount: number | undefined
): {
  state: StrategicState;
  previousState: StrategicState;
  pendingState: StrategicState | null;
  pendingCount: number;
} {
  const target = resolveTargetState(score, stressOverride, previousState ?? null);

  // First draft / no history: synthetic prior = current band
  if (previousState == null) {
    return {
      state: target,
      previousState: target,
      pendingState: null,
      pendingCount: 0,
    };
  }

  if (target === previousState) {
    return {
      state: previousState,
      previousState,
      pendingState: null,
      pendingCount: 0,
    };
  }

  // Target differs — need 2 consecutive closes confirming the same target
  const pend = pendingState ?? null;
  const count = pendingCount ?? 0;

  if (pend === target) {
    const nextCount = count + 1;
    if (nextCount >= 2) {
      return {
        state: target,
        previousState: target,
        pendingState: null,
        pendingCount: 0,
      };
    }
    return {
      state: previousState,
      previousState,
      pendingState: target,
      pendingCount: nextCount,
    };
  }

  // New pending candidate (first close of potential flip)
  return {
    state: previousState,
    previousState,
    pendingState: target,
    pendingCount: 1,
  };
}

function resolveTargetState(
  score: number,
  stressOverride: boolean,
  previous: StrategicState | null
): StrategicState {
  if (stressOverride || score <= -5.5) return "STRESS";

  if (previous === "RISK-ON") {
    // exit only if score < +2.0; otherwise stay RISK-ON (even if < enter +4.5)
    if (score < 2.0) {
      if (score >= -0.5) return "MIXED";
      if (score <= -3.0) return "RISK-OFF";
      return "RISK-OFF"; // (-3, -0.5)
    }
    return "RISK-ON";
  }

  if (previous === "RISK-OFF") {
    // exit only if score > -0.5
    if (score > -0.5) {
      if (score >= 4.5) return "RISK-ON";
      if (score >= 2.0) return "NEUTRAL-PLUS";
      return "MIXED";
    }
    if (score <= -5.5) return "STRESS";
    return "RISK-OFF"; // stay
  }

  if (previous === "STRESS") {
    // Exit STRESS when score > -5.5 and no stress override — use bands
    if (!stressOverride && score > -5.5) {
      return bandFromScore(score, false);
    }
    return "STRESS";
  }

  // NEUTRAL-PLUS / MIXED / null — band thresholds
  if (score >= 4.5) return "RISK-ON";
  if (score >= 2.0) return "NEUTRAL-PLUS";
  if (score >= -0.5) return "MIXED";
  if (score <= -3.0) return "RISK-OFF";
  return "RISK-OFF";
}

function breadthPctAboveSma10(semis: Record<string, number[]>): number | null {
  let ok = 0;
  let n = 0;
  for (const ticker of SEMIS_BREADTH_PROXY) {
    const s = semis[ticker];
    if (!s || s.length < 10) continue;
    const m = sma(s, 10);
    const px = last(s);
    if (m == null || px == null) continue;
    n++;
    if (px > m) ok++;
  }
  if (n === 0) return null;
  return (ok / n) * 100;
}

/** VIX vs VIX3M proxy: contango (healthy) when spot < 3m; backwardation when spot > 3m. */
function checkVixVsVix3m(
  vix?: number[],
  vix3m?: number[]
): { score: number; active: boolean; degraded: boolean; raw: string } {
  if (!vix?.length || !vix3m?.length) {
    return {
      score: 0,
      active: false,
      degraded: true,
      raw: "VIX or VIX3M unavailable",
    };
  }
  const spot = vix[vix.length - 1];
  const m3 = vix3m[vix3m.length - 1];
  if (spot == null || m3 == null || Number.isNaN(spot) || Number.isNaN(m3)) {
    return {
      score: 0,
      active: false,
      degraded: true,
      raw: "VIX or VIX3M unavailable",
    };
  }
  if (spot < m3) {
    return {
      score: 1,
      active: false,
      degraded: false,
      raw: `VIX ${spot.toFixed(2)} < VIX3M ${m3.toFixed(2)} (contango proxy)`,
    };
  }
  if (spot > m3) {
    return {
      score: -1,
      active: true,
      degraded: false,
      raw: `VIX ${spot.toFixed(2)} > VIX3M ${m3.toFixed(2)} (backwardation proxy)`,
    };
  }
  return {
    score: 0,
    active: false,
    degraded: false,
    raw: `VIX ${spot.toFixed(2)} = VIX3M ${m3.toFixed(2)} (flat)`,
  };
}

/** @deprecated Prefer checkVixVsVix3m — kept for any legacy callers. */
function checkVixBackwardation2d(
  front?: number[],
  second?: number[]
): { active: boolean; degraded: boolean } {
  if (!front || !second || front.length < 2 || second.length < 2) {
    return { active: false, degraded: true };
  }
  const n = Math.min(front.length, second.length);
  const f1 = front[n - 1];
  const f0 = front[n - 2];
  const s1 = second[n - 1];
  const s0 = second[n - 2];
  const back2 = f0 > s0 && f1 > s1;
  return { active: back2, degraded: false };
}

export function scoreRegime(inputs: RegimeInputs): RegimeScoreResult {
  const degraded: string[] = [];
  const contributions: Contribution[] = [];
  const inputLights: Record<string, LightStatus> = {};

  const add = (c: Contribution) => {
    contributions.push(c);
  };

  // --- NDX SMAs ---
  const ndxPx = last(inputs.ndx);
  const ndx10 = sma(inputs.ndx, 10);
  const ndx20 = sma(inputs.ndx, 20);
  const ndx50 = sma(inputs.ndx, 50);
  const ndxRoc3 = roc(inputs.ndx, 3);

  if (ndxPx == null) degraded.push("NDX");

  // NDX > SMA20 → +1.0
  if (ndxPx != null && ndx20 != null) {
    const pass = ndxPx > ndx20;
    add({
      id: "ndx_sma20",
      label: "NDX > SMA20",
      value: ndxPx,
      contribution: pass ? 1.0 : 0,
      raw: `NDX ${ndxPx.toFixed(2)} vs SMA20 ${ndx20.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.NDX20 = pass ? "pass" : "fail";
  } else {
    degraded.push("NDX20");
    inputLights.NDX20 = "degraded";
    add({
      id: "ndx_sma20",
      label: "NDX > SMA20",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // NDX > SMA50 → +1.0
  if (ndxPx != null && ndx50 != null) {
    const pass = ndxPx > ndx50;
    add({
      id: "ndx_sma50",
      label: "NDX > SMA50",
      value: ndxPx,
      contribution: pass ? 1.0 : 0,
      raw: `NDX ${ndxPx.toFixed(2)} vs SMA50 ${ndx50.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.NDX50 = pass ? "pass" : "fail";
  } else {
    degraded.push("NDX50");
    inputLights.NDX50 = "degraded";
    add({
      id: "ndx_sma50",
      label: "NDX > SMA50",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // NDX > SMA10 → +0.5
  if (ndxPx != null && ndx10 != null) {
    const pass = ndxPx > ndx10;
    add({
      id: "ndx_sma10",
      label: "NDX > SMA10",
      value: ndxPx,
      contribution: pass ? 0.5 : 0,
      raw: `NDX ${ndxPx.toFixed(2)} vs SMA10 ${ndx10.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.NDX10 = pass ? "pass" : "fail";
  } else {
    degraded.push("NDX10");
    inputLights.NDX10 = "degraded";
    add({
      id: "ndx_sma10",
      label: "NDX > SMA10",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // --- SMH ---
  const smhPx = last(inputs.smh);
  const smh10 = sma(inputs.smh, 10);
  const smh20 = sma(inputs.smh, 20);

  if (smhPx != null && smh20 != null) {
    const pass = smhPx > smh20;
    add({
      id: "smh_sma20",
      label: "SMH > SMA20",
      value: smhPx,
      contribution: pass ? 1.0 : 0,
      raw: `SMH ${smhPx.toFixed(2)} vs SMA20 ${smh20.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.SMH20 = pass ? "pass" : "fail";
  } else {
    degraded.push("SMH20");
    inputLights.SMH20 = "degraded";
    add({
      id: "smh_sma20",
      label: "SMH > SMA20",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  if (smhPx != null && smh10 != null) {
    const pass = smhPx > smh10;
    add({
      id: "smh_sma10",
      label: "SMH > SMA10",
      value: smhPx,
      contribution: pass ? 0.5 : 0,
      raw: `SMH ${smhPx.toFixed(2)} vs SMA10 ${smh10.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.SMH10 = pass ? "pass" : "fail";
  } else {
    degraded.push("SMH10");
    inputLights.SMH10 = "degraded";
    add({
      id: "smh_sma10",
      label: "SMH > SMA10",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // --- SPX SMA200 ---
  const spxPx = last(inputs.spx);
  const spx200 = sma(inputs.spx, 200);
  if (spxPx != null && spx200 != null) {
    const pass = spxPx > spx200;
    add({
      id: "spx_sma200",
      label: "SPX > SMA200",
      value: spxPx,
      contribution: pass ? 0.5 : 0,
      raw: `SPX ${spxPx.toFixed(2)} vs SMA200 ${spx200.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.SPX200 = pass ? "pass" : "fail";
  } else {
    // 6mo history often < 200 sessions — still mark degraded if short
    degraded.push("SPX200");
    inputLights.SPX200 = "degraded";
    add({
      id: "spx_sma200",
      label: "SPX > SMA200",
      value: spxPx,
      contribution: 0,
      raw:
        spxPx != null && inputs.spx.length < 200
          ? `Need 200 closes; have ${inputs.spx.length}`
          : undefined,
      status: "degraded",
    });
  }

  // --- NDX 3d ROC ---
  if (ndxRoc3 != null) {
    let contrib = 0;
    let status: LightStatus = "neutral";
    if (ndxRoc3 > 1.5) {
      contrib = 0.5;
      status = "pass";
    } else if (ndxRoc3 < -1.5) {
      contrib = -0.5;
      status = "fail";
    }
    add({
      id: "ndx_roc3",
      label: "NDX 3d ROC",
      value: ndxRoc3,
      contribution: contrib,
      raw: `${ndxRoc3.toFixed(2)}% (thresh ±1.5%)`,
      status,
    });
  } else {
    degraded.push("NDX_ROC3");
    add({
      id: "ndx_roc3",
      label: "NDX 3d ROC",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // --- SMH breadth ---
  const breadth = breadthPctAboveSma10(inputs.semis);
  if (breadth != null) {
    let contrib = 0;
    let status: LightStatus = "neutral";
    if (breadth > 60) {
      contrib = 1.0;
      status = "pass";
    } else if (breadth < 40) {
      contrib = -1.0;
      status = "fail";
    }
    add({
      id: "smh_breadth",
      label: "SMH breadth % > SMA10",
      value: breadth,
      contribution: contrib,
      raw: `${breadth.toFixed(1)}% (>60 +1 / <40 −1)`,
      status,
    });
    inputLights["SMH breadth"] = status;
  } else {
    degraded.push("SMH_breadth");
    inputLights["SMH breadth"] = "degraded";
    add({
      id: "smh_breadth",
      label: "SMH breadth % > SMA10",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // --- VIX level ---
  const vixPx = last(inputs.vix);
  const vix10 = sma(inputs.vix, 10);
  if (vixPx != null) {
    let contrib = 0;
    let status: LightStatus = "neutral";
    if (vixPx < 16) {
      contrib = 1.0;
      status = "pass";
    } else if (vixPx > 22) {
      contrib = -1.0;
      status = "fail";
    }
    add({
      id: "vix_level",
      label: "VIX level",
      value: vixPx,
      contribution: contrib,
      raw: `VIX ${vixPx.toFixed(2)} (<16 +1 / >22 −1)`,
      status,
    });
    inputLights.VIX = status;
  } else {
    degraded.push("VIX");
    inputLights.VIX = "degraded";
    add({
      id: "vix_level",
      label: "VIX level",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // --- VIX vs SMA10 ---
  if (vixPx != null && vix10 != null) {
    let contrib = 0;
    let status: LightStatus = "neutral";
    if (vixPx < vix10) {
      contrib = 0.5;
      status = "pass";
    } else if (vixPx > vix10) {
      contrib = -0.5;
      status = "fail";
    }
    add({
      id: "vix_sma10",
      label: "VIX vs SMA10",
      value: vixPx,
      contribution: contrib,
      raw: `VIX ${vixPx.toFixed(2)} vs SMA10 ${vix10.toFixed(2)}`,
      status,
    });
  } else {
    degraded.push("VIX_SMA10");
    add({
      id: "vix_sma10",
      label: "VIX vs SMA10",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  // --- VIX curve proxy: spot ^VIX vs ^VIX3M ---
  const curve = checkVixVsVix3m(inputs.vix, inputs.vix3m);
  let vixBackwardation2d = false;
  if (curve.degraded) {
    degraded.push("VIX_curve");
    inputLights["VIX curve"] = "degraded";
    add({
      id: "vix_curve",
      label: "VIX curve (VIX vs VIX3M proxy)",
      value: null,
      contribution: 0,
      raw: curve.raw,
      status: "degraded",
    });
  } else {
    vixBackwardation2d = curve.active;
    add({
      id: "vix_curve",
      label: "VIX curve (VIX vs VIX3M proxy)",
      value: curve.score,
      contribution: curve.score,
      raw: curve.raw,
      status: curve.score > 0 ? "pass" : curve.score < 0 ? "fail" : "pass",
    });
    inputLights["VIX curve"] = curve.score < 0 ? "fail" : "pass";
  }

  // --- HYG ---
  const hygPx = last(inputs.hyg);
  const hyg10 = sma(inputs.hyg, 10);
  if (hygPx != null && hyg10 != null) {
    const pass = hygPx > hyg10;
    add({
      id: "hyg_sma10",
      label: "HYG > SMA10",
      value: hygPx,
      contribution: pass ? 0.5 : -0.5,
      raw: `HYG ${hygPx.toFixed(2)} vs SMA10 ${hyg10.toFixed(2)}`,
      status: pass ? "pass" : "fail",
    });
    inputLights.HYG = pass ? "pass" : "fail";
  } else {
    degraded.push("HYG");
    inputLights.HYG = "degraded";
    add({
      id: "hyg_sma10",
      label: "HYG > SMA10",
      value: null,
      contribution: 0,
      status: "degraded",
    });
  }

  const strategicScore = contributions.reduce((s, c) => s + c.contribution, 0);

  const stressOverride =
    vixBackwardation2d && vixPx != null && vixPx > 22;

  const hyst = applyStrategicHysteresis(
    strategicScore,
    stressOverride,
    inputs.previousState,
    inputs.pendingState,
    inputs.pendingCount
  );

  // --- Tactical overlay ---
  const { tacticalLabel, tacticalScore } = scoreTactical({
    ndx: inputs.ndx,
    smhBreadth: breadth,
    vix: inputs.vix,
    vixBackwardation2d,
  });

  // --- SPEC sleeve (not in master score) ---
  const specRs5d = computeSpecRs(inputs.spec, inputs.qqq);
  let specOn = false;
  if (specRs5d != null) {
    const strategicOk =
      hyst.state === "RISK-ON" ||
      hyst.state === "NEUTRAL-PLUS" ||
      hyst.state === "MIXED";
    if (
      specRs5d > 3 &&
      tacticalLabel !== "STRESSING" &&
      strategicOk
    ) {
      specOn = true;
    }
    if (
      specRs5d < -3 ||
      tacticalLabel === "STRESSING" ||
      hyst.state === "RISK-OFF" ||
      hyst.state === "STRESS"
    ) {
      specOn = false;
    }
    // Mid band −3..+3: default OFF unless ON condition met
  } else {
    degraded.push("SPEC_RS");
  }

  return {
    strategicScore: Math.round(strategicScore * 100) / 100,
    strategicState: hyst.state,
    tacticalLabel,
    tacticalScore,
    specOn,
    specRs5d,
    contributions,
    inputLights,
    degraded: [...new Set(degraded)],
    sizingHint: SIZING_HINTS[hyst.state],
    vixBackwardation2d,
    previousState: hyst.previousState,
    pendingState: hyst.pendingState,
    pendingCount: hyst.pendingCount,
    raw: {
      ndx: ndxPx ?? NaN,
      ndxSma10: ndx10,
      ndxSma20: ndx20,
      ndxSma50: ndx50,
      ndxRoc3,
      smh: smhPx ?? NaN,
      smhSma10: smh10,
      smhSma20: smh20,
      spx: spxPx ?? NaN,
      spxSma200: spx200,
      vix: vixPx ?? NaN,
      vixSma10: vix10,
      smhBreadthPct: breadth,
      hyg: hygPx ?? NaN,
      hygSma10: hyg10,
    },
  };
}

function scoreTactical(args: {
  ndx: number[];
  smhBreadth: number | null;
  vix: number[];
  vixBackwardation2d: boolean;
}): { tacticalLabel: TacticalLabel; tacticalScore: number } {
  let t = 0;
  const ndx10 = sma(args.ndx, 10);
  const ndxPx = last(args.ndx);
  const ndxRoc3 = roc(args.ndx, 3);
  const vixPx = last(args.vix);
  const vix10 = sma(args.vix, 10);

  // 10-day trend
  if (ndxPx != null && ndx10 != null) {
    t += ndxPx > ndx10 ? 1 : -1;
  }
  // 3-day ROC
  if (ndxRoc3 != null) {
    if (ndxRoc3 > 1.5) t += 1;
    else if (ndxRoc3 < -1.5) t -= 1;
  }
  // SMH breadth
  if (args.smhBreadth != null) {
    if (args.smhBreadth > 60) t += 1;
    else if (args.smhBreadth < 40) t -= 1;
  }
  // VIX vs 10-day
  if (vixPx != null && vix10 != null) {
    if (vixPx < vix10) t += 1;
    else if (vixPx > vix10) t -= 1;
  }
  // Stressing if backwardation confirmed or very high VIX pressure
  if (args.vixBackwardation2d && vixPx != null && vixPx > 22) {
    return { tacticalLabel: "STRESSING", tacticalScore: t };
  }

  let label: TacticalLabel = "STABLE";
  if (t >= 2) label = "FIRMING";
  else if (t <= -2) label = "FADING";
  else label = "STABLE";

  // Extra stressing: VIX > 22 and fading
  if (vixPx != null && vixPx > 22 && t <= -1) {
    label = "STRESSING";
  }

  return { tacticalLabel: label, tacticalScore: t };
}

function computeSpecRs(
  spec: Record<string, number[]>,
  qqq: number[]
): number | null {
  const rets: number[] = [];
  for (const t of SPEC_TICKERS) {
    const s = spec[t];
    if (!s || s.length < 6) continue;
    const a = s[s.length - 1];
    const b = s[s.length - 6];
    if (b === 0) continue;
    rets.push(((a - b) / b) * 100);
  }
  if (rets.length === 0 || qqq.length < 6) return null;
  const basket = rets.reduce((a, b) => a + b, 0) / rets.length;
  const q0 = qqq[qqq.length - 6];
  const q1 = qqq[qqq.length - 1];
  if (q0 === 0) return null;
  const qRet = ((q1 - q0) / q0) * 100;
  return Math.round((basket - qRet) * 100) / 100;
}
