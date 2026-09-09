import type {
  CanaryReading,
  CanaryScore,
  CanaryState,
  MembersPayload,
  PublicSnapshot,
  Stance,
  TrafficLight,
} from "./types";

export function normalizeLight(raw: string | undefined | null): TrafficLight | null {
  if (!raw) return null;
  const k = raw.trim().toLowerCase();
  if (k === "green") return "Green";
  if (k === "amber" || k === "yellow") return "Amber";
  if (k === "red") return "Red";
  return null;
}

export function isUnverified(c: CanaryReading): boolean {
  if (c.status === "UNVERIFIED") return true;
  if (c.verified === false) return true;
  if (c.score === "UNVERIFIED" || c.score === null) return true;
  return false;
}

export function numericScore(score: CanaryScore): number | null {
  if (score === "UNVERIFIED" || score === null || score === undefined) return null;
  return score;
}

export function effectiveWeight(c: CanaryReading): number {
  if (typeof c.weightEffective === "number") return c.weightEffective;
  return c.weight;
}

export function contributionOf(c: CanaryReading): number | null {
  if (typeof c.contribution === "number") return c.contribution;
  if (isUnverified(c)) return null;
  const n = numericScore(c.score);
  if (n === null) return null;
  return Number((effectiveWeight(c) * n).toFixed(4));
}

/** S = sum(w_i * s_i); UNVERIFIED / null treated as 0 contribution. Prefer weightEffective. */
export function computeS(canaries: CanaryReading[]): number {
  let s = 0;
  for (const c of canaries) {
    if (isUnverified(c)) continue;
    const n = numericScore(c.score);
    if (n === null) continue;
    s += effectiveWeight(c) * n;
  }
  return Number(s.toFixed(4));
}

function isSick(c: CanaryReading): boolean {
  if (isUnverified(c)) return false;
  const n = numericScore(c.score);
  if (n === null) return false;
  return n <= -1;
}

/**
 * Veto: VIX/US10Y Danger Above 5 AND both NYSE A-D and % above 200-day sick
 * → cannot be green. Live packs may supply veto.triggered instead.
 */
export function vetoBlocksGreen(canaries: CanaryReading[]): boolean {
  const vix = canaries.find((c) => c.id === "vix-us10y");
  const nyse = canaries.find((c) => c.id === "nyse-ad");
  const breadth = canaries.find((c) => c.id === "pct-above-200dma");
  if (!vix || !nyse || !breadth) return false;

  const dangerAbove5 =
    vix.statusHint === "Danger Above 5" ||
    (typeof vix.lastReading === "string" &&
      !Number.isNaN(Number(vix.lastReading)) &&
      Number(vix.lastReading) > 5);

  return dangerAbove5 && isSick(nyse) && isSick(breadth);
}

export function trafficLightFor(
  S: number,
  canaries: CanaryReading[]
): { light: TrafficLight; vetoApplied: boolean } {
  let light: TrafficLight;
  if (S >= 0.6) light = "Green";
  else if (S >= -0.3) light = "Amber";
  else light = "Red";

  const vetoApplied = light === "Green" && vetoBlocksGreen(canaries);
  if (vetoApplied) light = "Amber";
  return { light, vetoApplied };
}

export function stanceFor(light: TrafficLight): Stance {
  switch (light) {
    case "Green":
      return "Stay in the market";
    case "Amber":
      return "Stay alert";
    case "Red":
      return "Get defensive";
  }
}

/** Prefer Scorekeeper composite when present — do not invent alternate S/light. */
export function toPublicSnapshot(state: CanaryState): PublicSnapshot {
  const fromPack = normalizeLight(state.composite?.light);
  const S =
    typeof state.composite?.S === "number"
      ? state.composite.S
      : computeS(state.canaries);

  let light: TrafficLight;
  let vetoApplied: boolean;

  if (fromPack) {
    light = fromPack;
    vetoApplied = Boolean(state.veto?.triggered);
  } else {
    const computed = trafficLightFor(S, state.canaries);
    light = computed.light;
    vetoApplied = computed.vetoApplied;
  }

  return {
    light,
    S,
    asOf: state.asOf,
    stance: stanceFor(light),
    fixture: Boolean(state.fixture),
    fixtureLabel: state.fixture ? state.fixtureLabel : undefined,
    vetoApplied,
  };
}

export function toMembersPayload(state: CanaryState): MembersPayload {
  const publicSnap = toPublicSnapshot(state);
  const weightSum = Number(
    state.canaries.reduce((acc, c) => acc + effectiveWeight(c), 0).toFixed(4)
  );
  return {
    ...publicSnap,
    weightSum,
    letterArchive: state.letterArchive ?? [],
    placeholders: state.placeholders,
    packMark: state.packMark,
    unverified: state.unverified,
    renormalization: state.renormalization,
    canaries: state.canaries.map((c) => {
      const unverified = isUnverified(c);
      // Preserve numeric scores when present; map null-only UNVERIFIED to the label.
      const score =
        unverified && (c.score === null || c.score === undefined)
          ? ("UNVERIFIED" as const)
          : c.score;
      return {
        ...c,
        score,
        displayWeight: effectiveWeight(c),
        numericScore: unverified ? null : numericScore(c.score),
        contribution: contributionOf(c),
      };
    }),
  };
}
