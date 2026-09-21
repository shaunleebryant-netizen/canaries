/**
 * Market Regime box v2 — 6-input owner decision rule (2026-09-19).
 * Regime pill from 4 core votes → R; Spec FULL/HALF/OFF separately.
 * Composite S / CanaryTable still use all 13 Option B weights — not this box.
 * DRAFT / local only — do not deploy.
 */

import { bandFromMediumRatio, type VolCurveBand } from "../volCurve/computeVolCurve";

export type RegimeStateName = "RISK_ON" | "MIXED" | "RISK_OFF";

export type SpecLevel = "FULL" | "HALF" | "OFF";

export type Vote = 1 | 0 | -1;

export interface RegimeCanaryInput {
  id: string;
  name: string;
  score: number | "UNVERIFIED" | null;
  weight?: number;
  weightNominal?: number;
  weightEffective?: number;
  status?: string;
  contribution?: number | null;
  /** Optional VIX/VIX3M medium ratio for band vote. */
  mediumRatio?: number | null;
  /** Optional precomputed vol-curve band. */
  band?: VolCurveBand | null;
}

export interface RegimeHistoryEntry {
  date: string;
  /** @deprecated v1 C composite — prefer R */
  C?: number;
  R?: number;
  stateRaw: RegimeStateName;
  stateShown: RegimeStateName;
}

export interface RegimeHistoryFile {
  asOf?: string;
  stateShown?: RegimeStateName;
  pendingState?: RegimeStateName | null;
  pendingCount?: number;
  daysInState?: number;
  lastChangeDate?: string | null;
  sessions?: RegimeHistoryEntry[];
}

export type RegimeLightSymbol = "+" | "−" | "○";

export interface RegimeLight {
  id: string;
  label: string;
  vote: Vote;
  symbol: RegimeLightSymbol;
}

export interface ComputeRegimeResult {
  /** Sum of 4 core votes ∈ [−4, +4]. */
  R: number;
  stateRaw: RegimeStateName;
  stateShown: RegimeStateName;
  spec: SpecLevel;
  /** Short A–D / SP600 note for SPEC line. */
  specNote: string;
  lights: RegimeLight[];
  votes: {
    "qqq-sma20": Vote;
    "cyclical-defensive": Vote;
    "vix-vix3m": Vote;
    "hyg-ief-sma20": Vote;
    "nyse-ad": Vote;
    sp600: Vote;
  };
  oneLiner: string;
  daysInState: number;
  asOf: string;
  pendingState: RegimeStateName | null;
  pendingCount: number;
  draft?: boolean;
}

/** 6 box seats only — not the flock. */
export const REGIME_BOX_CORE_IDS = [
  "qqq-sma20",
  "cyclical-defensive",
  "vix-vix3m",
  "hyg-ief-sma20",
] as const;

export const REGIME_BOX_SPEC_IDS = ["nyse-ad", "sp600"] as const;

export const REGIME_BOX_IDS = [
  ...REGIME_BOX_CORE_IDS,
  ...REGIME_BOX_SPEC_IDS,
] as const;

export const REGIME_LIGHT_LABELS: Record<(typeof REGIME_BOX_IDS)[number], string> = {
  "qqq-sma20": "QQQ20",
  "cyclical-defensive": "Cyc/Def",
  "vix-vix3m": "VIX3M",
  "hyg-ief-sma20": "HYG/IEF",
  "nyse-ad": "A–D",
  sp600: "SP600",
};

/**
 * Option B flock weights for composite S (13 seats). Kept here so docs/tests
 * can assert sum ≈ 1.00. Regime box does NOT use these.
 */
export const REGIME_WEIGHTS: Record<string, number> = {
  "cyclical-defensive": 0.0935,
  "xlf-kre": 0.0765,
  "vix-vix3m": 0.1135,
  "nyse-ad": 0.085,
  "pct-above-200dma": 0.0935,
  "es1-jp30": 0.0595,
  "sp-top-50": 0.068,
  sp600: 0.068,
  rsp: 0.068,
  "vix-vvix": 0.0565,
  "finra-margin": 0.068,
  "qqq-sma20": 0.08,
  "hyg-ief-sma20": 0.07,
};

export function weightSum(weights: Record<string, number> = REGIME_WEIGHTS): number {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

export function voteFromScore(score: number | null | undefined): Vote {
  if (score == null || Number.isNaN(score)) return 0;
  if (score >= 1) return 1;
  if (score <= -1) return -1;
  return 0;
}

export function voteFromVolBand(band: VolCurveBand): Vote {
  if (band === "SAFE") return 1;
  if (band === "DANGER") return -1;
  return 0;
}

function numericScore(c: RegimeCanaryInput | undefined): number | null {
  if (!c) return null;
  if (c.status === "UNVERIFIED") return null;
  if (c.score === "UNVERIFIED" || c.score === null || c.score === undefined) {
    return null;
  }
  if (typeof c.score !== "number" || Number.isNaN(c.score)) return null;
  return c.score;
}

/** Vote for one box seat. VIX/VIX3M prefers band / mediumRatio when present. */
export function voteForCanary(
  c: RegimeCanaryInput | undefined,
  opts?: { mediumRatio?: number | null }
): Vote {
  if (!c) {
    if (opts?.mediumRatio != null && !Number.isNaN(opts.mediumRatio)) {
      return voteFromVolBand(bandFromMediumRatio(opts.mediumRatio));
    }
    return 0;
  }

  if (c.id === "vix-vix3m") {
    if (c.band === "SAFE" || c.band === "CAUTION" || c.band === "DANGER") {
      return voteFromVolBand(c.band);
    }
    const ratio =
      c.mediumRatio != null && !Number.isNaN(c.mediumRatio)
        ? c.mediumRatio
        : opts?.mediumRatio != null && !Number.isNaN(opts.mediumRatio)
          ? opts.mediumRatio
          : null;
    if (ratio != null) {
      return voteFromVolBand(bandFromMediumRatio(ratio));
    }
  }

  return voteFromScore(numericScore(c));
}

export function stateFromR(R: number): RegimeStateName {
  if (R >= 2) return "RISK_ON";
  if (R <= -2) return "RISK_OFF";
  return "MIXED";
}

/**
 * Spec after regime. No hysteresis — OFF can flip in one session
 * when QQQ20 or VIX/VIX3M → −1.
 */
export function computeSpec(opts: {
  regime: RegimeStateName;
  qqq: Vote;
  vix: Vote;
  ad: Vote;
  sp600: Vote;
}): SpecLevel {
  const { regime, qqq, vix, ad, sp600 } = opts;
  if (regime === "MIXED" || regime === "RISK_OFF") return "OFF";
  if (qqq === -1 || vix === -1) return "OFF";
  // RISK_ON path
  const adOk = ad >= 0;
  const spOk = sp600 >= 0;
  if (adOk && spOk) return "FULL";
  if (adOk !== spOk) return "HALF";
  return "OFF";
}

export function formatSpecNote(ad: Vote, sp600: Vote): string {
  const adPart = ad >= 0 ? "A–D ok" : "A–D weak";
  const spPart = sp600 >= 0 ? "SP600 ok" : "SP600 weak";
  return `${adPart} · ${spPart}`;
}

export function symbolFromVote(v: Vote): RegimeLightSymbol {
  if (v === 1) return "+";
  if (v === -1) return "−";
  return "○";
}

export function boardOneLiner(opts: {
  regime: RegimeStateName;
  spec: SpecLevel;
  R: number;
  ad: Vote;
  sp600: Vote;
  qqq?: Vote;
  vix?: Vote;
}): string {
  const { regime, spec, R, ad, sp600, qqq = 0, vix = 0 } = opts;
  if (regime === "RISK_ON" && spec === "FULL") {
    return "Risk-on board — Spec sleeve open.";
  }
  if (regime === "RISK_ON" && spec === "HALF") {
    if (ad < 0) return "Risk-on, but internals soft — half Spec.";
    if (sp600 < 0) return "Risk-on, but small-caps soft — half Spec.";
    return "Risk-on with a soft gate — half Spec.";
  }
  if (regime === "RISK_ON" && spec === "OFF") {
    if (ad < 0 && sp600 < 0) {
      return "Risk-on tape, but both Spec gates are soft — Spec off.";
    }
    if (qqq === -1 || vix === -1) {
      return "Risk-on tape, but a stress vote blocked Spec.";
    }
    return "Risk-on tape, but Spec is closed.";
  }
  if (regime === "RISK_OFF") {
    return `Risk-off (R ${R >= 0 ? "+" : ""}${R}) — Spec off.`;
  }
  return `Mixed (R ${R >= 0 ? "+" : ""}${R}) — wait for clearer votes.`;
}

/**
 * Apply 2-session hysteresis on the regime pill only.
 * stateShown flips only after 2 consecutive sessions with the same new stateRaw.
 */
export function applyHysteresis(
  stateRaw: RegimeStateName,
  history: RegimeHistoryFile | null | undefined,
  asOf?: string
): {
  stateShown: RegimeStateName;
  pendingState: RegimeStateName | null;
  pendingCount: number;
  daysInState: number;
} {
  const prevShown: RegimeStateName =
    history?.stateShown ??
    history?.sessions?.[history.sessions.length - 1]?.stateShown ??
    stateRaw;

  // Same calendar session already persisted — do not advance counters again
  if (asOf && history?.asOf === asOf) {
    return {
      stateShown: (history.stateShown as RegimeStateName) ?? prevShown,
      pendingState: (history.pendingState as RegimeStateName | null) ?? null,
      pendingCount: history.pendingCount ?? 0,
      daysInState: history.daysInState ?? 1,
    };
  }

  let pendingState: RegimeStateName | null =
    (history?.pendingState as RegimeStateName | null | undefined) ?? null;
  let pendingCount = history?.pendingCount ?? 0;

  if (stateRaw === prevShown) {
    pendingState = null;
    pendingCount = 0;
    let daysInState = (history?.daysInState ?? 0) + 1;
    if (!history?.stateShown && !(history?.sessions?.length)) {
      daysInState = 1;
    }
    return { stateShown: prevShown, pendingState, pendingCount, daysInState };
  }

  if (pendingState === stateRaw) {
    pendingCount += 1;
  } else {
    pendingState = stateRaw;
    pendingCount = 1;
  }

  if (pendingCount >= 2) {
    return {
      stateShown: stateRaw,
      pendingState: null,
      pendingCount: 0,
      daysInState: 1,
    };
  }

  return {
    stateShown: prevShown,
    pendingState,
    pendingCount,
    daysInState: (history?.daysInState ?? 1) + 1,
  };
}

function findCanary(
  canaries: RegimeCanaryInput[],
  id: string
): RegimeCanaryInput | undefined {
  return canaries.find((c) => c.id === id);
}

export function computeRegime(
  canaries: RegimeCanaryInput[],
  opts?: {
    asOf?: string;
    history?: RegimeHistoryFile | null;
    /** VIX/VIX3M ratio when not on the canary row. */
    mediumRatio?: number | null;
  }
): ComputeRegimeResult {
  const mediumRatio = opts?.mediumRatio ?? null;

  const qqq = voteForCanary(findCanary(canaries, "qqq-sma20"));
  const cyc = voteForCanary(findCanary(canaries, "cyclical-defensive"));
  const vix = voteForCanary(findCanary(canaries, "vix-vix3m"), { mediumRatio });
  const hyg = voteForCanary(findCanary(canaries, "hyg-ief-sma20"));
  const ad = voteForCanary(findCanary(canaries, "nyse-ad"));
  const sp600 = voteForCanary(findCanary(canaries, "sp600"));

  const R = qqq + cyc + vix + hyg;
  const stateRaw = stateFromR(R);
  const asOf =
    opts?.asOf ??
    opts?.history?.asOf ??
    new Date().toISOString().slice(0, 10);
  const hyst = applyHysteresis(stateRaw, opts?.history, asOf);

  // Spec has no hysteresis — use raw R band so OFF can flip in one session.
  const spec = computeSpec({
    regime: stateRaw,
    qqq,
    vix,
    ad,
    sp600,
  });
  const specNote = formatSpecNote(ad, sp600);

  const votes = {
    "qqq-sma20": qqq,
    "cyclical-defensive": cyc,
    "vix-vix3m": vix,
    "hyg-ief-sma20": hyg,
    "nyse-ad": ad,
    sp600,
  } as const;

  const lights: RegimeLight[] = REGIME_BOX_IDS.map((id) => ({
    id,
    label: REGIME_LIGHT_LABELS[id],
    vote: votes[id],
    symbol: symbolFromVote(votes[id]),
  }));

  return {
    R,
    stateRaw,
    stateShown: hyst.stateShown,
    spec,
    specNote,
    lights,
    votes,
    oneLiner: boardOneLiner({
      regime: stateRaw,
      spec,
      R,
      ad,
      sp600,
      qqq,
      vix,
    }),
    daysInState: hyst.daysInState,
    asOf,
    pendingState: hyst.pendingState,
    pendingCount: hyst.pendingCount,
    draft: true,
  };
}
