/**
 * Vol Curve Canary — pure sizing/checklist layer (DRAFT).
 *
 * VIX / VIX3M sizing bands for the members draft card.
 * Dual seats (locked 2026-09-19): flock `vix-vix3m` = ratio scoring
 * (replaces former VIX/US10Y); `vix-curve` = binary contango (0.08) — KEEP BOTH.
 * This module is NOT a third flock score — sizing/checklist only
 * (slope, Spec/Core, optional credit confirm).
 *
 * EMA pair locked here: fast EMA(5) vs slow EMA(20) of the medium ratio.
 * Education only — do not invent prints; missing → PENDING / null.
 */

export type VolCurveBand = "SAFE" | "CAUTION" | "DANGER";

export type VolCurveStance = VolCurveBand;

export type CreditConfirmLabel = "Confirming" | "Fighting" | "Quiet" | "Pending";

export type ChecklistDot = "pass" | "fail" | "neutral" | "pending";

export interface VolCurveHygIefInput {
  ratio: number | null;
  sma20: number | null;
  /** Optional: series falling recently while ratio climbing. */
  rollingOver?: boolean | null;
  status?: "VERIFIED" | "PENDING" | "UNVERIFIED" | string;
}

export interface VolCurveComputeInput {
  asOf?: string;
  vix?: number | null;
  vix3m?: number | null;
  /** Daily medium ratios oldest→newest (for slope / 5d Δ / MAs). */
  mediumHistory?: number[];
  hygIef?: VolCurveHygIefInput | null;
}

export interface SlopeFilters {
  /** Count of consecutive daily rises ending at latest print. */
  consecutiveRises: number;
  /** True when 3–5 consecutive rises (front-end bid grind). */
  consecutiveRisesFlag: boolean;
  aboveMa10: boolean | null;
  aboveMa20: boolean | null;
  /** EMA(5) > EMA(20) of medium ratio. */
  emaCross: boolean | null;
  chips: string[];
}

export interface VolCurvePolicies {
  spec: string;
  core: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistDot;
  detail: string;
}

export interface CreditConfirm {
  label: CreditConfirmLabel;
  detail: string;
  /** True when HYG/IEF is rolling over or below MA while curve climbs. */
  riskOffConfirm: boolean;
}

export interface ComputeVolCurveResult {
  asOf: string;
  band: VolCurveBand;
  stance: VolCurveStance;
  mediumRatio: number | null;
  mediumDelta5d: number | null;
  rollingOver: boolean | null;
  slope: SlopeFilters;
  policies: VolCurvePolicies;
  credit: CreditConfirm;
  checklist: ChecklistItem[];
  oneLiner: string;
  draftsNote: string;
}

/** Owner band map. Ratios between 0.95 and 0.96 remain in the lower band. */
export function bandFromMediumRatio(ratio: number): VolCurveBand {
  if (ratio >= 0.96) return "DANGER";
  if (ratio >= 0.91) return "CAUTION";
  return "SAFE";
}

export function ratioOrNull(
  num: number | null | undefined,
  den: number | null | undefined
): number | null {
  if (
    num == null ||
    den == null ||
    den === 0 ||
    Number.isNaN(num) ||
    Number.isNaN(den)
  ) {
    return null;
  }
  return Number((num / den).toFixed(6));
}

function sma(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / window;
}

/** Classic EMA; needs at least `period` samples. */
function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i]! * k + e * (1 - k);
  }
  return e;
}

export function consecutiveRises(history: number[]): number {
  if (history.length < 2) return 0;
  let n = 0;
  for (let i = history.length - 1; i > 0; i--) {
    if (history[i]! > history[i - 1]!) n++;
    else break;
  }
  return n;
}

/** Latest minus value 5 sessions earlier (needs ≥6 points). */
export function delta5d(history: number[]): number | null {
  if (history.length < 6) return null;
  const latest = history[history.length - 1]!;
  const prior = history[history.length - 6]!;
  return Number((latest - prior).toFixed(6));
}

/** Rolling over describes the medium curve trend for the optional credit confirm. */
export function isRollingOver(history: number[]): boolean | null {
  if (history.length < 2) return null;
  const last = history[history.length - 1]!;
  const prev = history[history.length - 2]!;
  const d5 = delta5d(history);
  if (d5 != null) return last < prev || d5 < 0;
  return last < prev;
}

export function computeSlopeFilters(history: number[]): SlopeFilters {
  const rises = consecutiveRises(history);
  const consecutiveRisesFlag = rises >= 3 && rises <= 5;
  const latest = history.length ? history[history.length - 1]! : null;
  const ma10 = sma(history, 10);
  const ma20 = sma(history, 20);
  const aboveMa10 = latest != null && ma10 != null ? latest > ma10 : null;
  const aboveMa20 = latest != null && ma20 != null ? latest > ma20 : null;
  const e5 = ema(history, 5);
  const e20 = ema(history, 20);
  const emaCross = e5 != null && e20 != null ? e5 > e20 : null;

  const chips: string[] = [];
  if (consecutiveRisesFlag) chips.push(`${rises}d rise`);
  else if (rises > 5) chips.push(`${rises}d grind`);
  if (aboveMa10 === true) chips.push(">10dma");
  if (aboveMa20 === true) chips.push(">20dma");
  if (emaCross === true) chips.push("EMA 5>20");

  return {
    consecutiveRises: rises,
    consecutiveRisesFlag,
    aboveMa10,
    aboveMa20,
    emaCross,
    chips,
  };
}

export function creditConfirm(
  hygIef: VolCurveHygIefInput | null | undefined,
  mediumRatio: number | null,
  mediumClimbing: boolean | null
): CreditConfirm {
  if (
    !hygIef ||
    hygIef.status === "PENDING" ||
    hygIef.ratio == null ||
    hygIef.sma20 == null
  ) {
    return {
      label: "Pending",
      detail: "HYG/IEF feed pending — no credit confirm yet.",
      riskOffConfirm: false,
    };
  }

  const belowMa = hygIef.ratio < hygIef.sma20;
  const rolling = hygIef.rollingOver === true;
  const climbing =
    mediumClimbing === true ||
    (mediumRatio != null && mediumRatio >= 0.91);
  const riskOffConfirm = (belowMa || rolling) && climbing;

  if (riskOffConfirm) {
    return {
      label: "Confirming",
      detail:
        "HYG/IEF soft (below MA or rolling over) while VIX/VIX3M climbs through 0.91 — risk-off confirm.",
      riskOffConfirm: true,
    };
  }

  if (!belowMa && !rolling && climbing) {
    return {
      label: "Fighting",
      detail:
        "Vol curve elevated but HYG/IEF still strong — event scare / soft confirm only.",
      riskOffConfirm: false,
    };
  }

  return {
    label: "Quiet",
    detail: "Credit still prefers high-yielding junk bonds vs 10-year US treasuries - No veto.",
    riskOffConfirm: false,
  };
}

/** VIX/VIX3M bands are a sizing layer, not a top call. */
export function policiesForStance(stance: VolCurveStance): VolCurvePolicies {
  switch (stance) {
    case "SAFE":
      return { spec: "full", core: "full" };
    case "CAUTION":
      return {
        spec: "trim 25–50% tactical / short-vol / overnight",
        core: "hold",
      };
    case "DANGER":
      return {
        spec: "flat / optional long-vol only",
        core: "reduce · defense",
      };
  }
}

/** Stance is now exactly the owner band; there is no secondary fade state. */
export function resolveStance(opts: {
  band: VolCurveBand;
  mediumRatio?: number | null;
  rollingOver?: boolean | null;
  credit?: CreditConfirm;
}): VolCurveStance {
  return opts.band;
}

function buildChecklist(opts: {
  mediumRatio: number | null;
  mediumDelta5d: number | null;
  band: VolCurveBand;
  credit: CreditConfirm;
}): ChecklistItem[] {
  const { mediumRatio, band, credit } = opts;
  void opts.mediumDelta5d;
  const mediumStatus: ChecklistDot =
    mediumRatio == null
      ? "pending"
      : band === "SAFE"
        ? "pass"
        : band === "CAUTION"
          ? "neutral"
          : "fail";
  const medium: ChecklistItem = {
    id: "medium",
    label: "VIX/VIX3M",
    status: mediumStatus,
    detail:
      mediumRatio == null
        ? "VIX/VIX3M pending."
        : mediumRatio.toFixed(3),
  };

  const creditItem: ChecklistItem = {
    id: "credit",
    label: "HYG/IEF",
    status:
      credit.label === "Pending"
        ? "pending"
        : credit.label === "Confirming"
          ? "fail"
          : credit.label === "Fighting"
            ? "neutral"
            : "pass",
    detail: credit.detail,
  };

  return [medium, creditItem];
}

export function boardOneLiner(opts: {
  stance: VolCurveStance;
  mediumRatio: number | null;
  credit: CreditConfirm;
}): string {
  const { stance, mediumRatio, credit } = opts;
  if (stance === "DANGER") {
    return "VIX/VIX3M ≥ 0.96 — danger; reduce risk and use defense sizing.";
  }
  if (stance === "CAUTION") {
    if (credit.label === "Confirming") {
      return "VIX/VIX3M 0.91–0.95 with credit confirming — tighten risk.";
    }
    return "VIX/VIX3M 0.91–0.95 — caution; trim tactical and short-vol risk.";
  }
  if (mediumRatio == null) return "VIX/VIX3M pending — no size signal.";
  return `VIX/VIX3M ${mediumRatio.toFixed(3)} (< 0.91) — safe sizing band.`;
}

export function computeVolCurve(
  input: VolCurveComputeInput
): ComputeVolCurveResult {
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const mediumRatio = ratioOrNull(input.vix, input.vix3m);

  // Prefer caller-supplied mediumHistory for slope / 5d Δ (do not overwrite).
  // If absent, seed a single-point series from today's medium print only.
  const history =
    input.mediumHistory && input.mediumHistory.length > 0
      ? [...input.mediumHistory]
      : mediumRatio != null
        ? [mediumRatio]
        : [];

  const mediumDelta5d = delta5d(history);
  const rollingOver = isRollingOver(history);
  const slope = computeSlopeFilters(history);
  const band = mediumRatio != null ? bandFromMediumRatio(mediumRatio) : "SAFE";
  const mediumClimbing =
    mediumDelta5d != null
      ? mediumDelta5d > 0
      : rollingOver === false
        ? true
        : rollingOver === true
          ? false
          : null;

  const credit = creditConfirm(input.hygIef, mediumRatio, mediumClimbing);
  const stance = resolveStance({ band, mediumRatio, rollingOver, credit });
  const policies = policiesForStance(stance);
  const checklist = buildChecklist({
    mediumRatio,
    mediumDelta5d,
    band,
    credit,
  });
  const oneLiner = boardOneLiner({ stance, mediumRatio, credit });

  return {
    asOf,
    band,
    stance,
    mediumRatio,
    mediumDelta5d,
    rollingOver,
    slope,
    policies,
    credit,
    checklist,
    oneLiner,
    draftsNote:
      "Position Sizing Guide.",
  };
}
