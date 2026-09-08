import type {
  CanaryReading,
  CanaryScore,
  MembersPayload,
  PublicSnapshot,
  Stance,
  TrafficLight,
} from "./types";

export function numericScore(score: CanaryScore): number | null {
  if (score === "UNVERIFIED") return null;
  return score;
}

export function contributionOf(c: CanaryReading): number | null {
  const n = numericScore(c.score);
  if (n === null) return null;
  return Number((c.weight * n).toFixed(4));
}

/** S = sum(w_i * s_i); UNVERIFIED treated as 0 contribution. */
export function computeS(canaries: CanaryReading[]): number {
  let s = 0;
  for (const c of canaries) {
    const n = numericScore(c.score);
    if (n === null) continue;
    s += c.weight * n;
  }
  return Number(s.toFixed(4));
}

function isSick(score: CanaryScore): boolean {
  if (score === "UNVERIFIED") return false;
  return score <= -1;
}

/**
 * Veto: VIX/US10Y Danger Above 5 AND both NYSE A-D and % above 200-day sick
 * → cannot be green.
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

  return dangerAbove5 && isSick(nyse.score) && isSick(breadth.score);
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

export function toPublicSnapshot(
  canaries: CanaryReading[],
  asOf: string,
  fixture: boolean,
  fixtureLabel?: string
): PublicSnapshot {
  const S = computeS(canaries);
  const { light, vetoApplied } = trafficLightFor(S, canaries);
  return {
    light,
    S,
    asOf,
    stance: stanceFor(light),
    fixture,
    fixtureLabel: fixture ? fixtureLabel : undefined,
    vetoApplied,
  };
}

export function toMembersPayload(state: {
  canaries: CanaryReading[];
  asOf: string;
  fixture: boolean;
  fixtureLabel: string;
  letterArchive: MembersPayload["letterArchive"];
  placeholders: MembersPayload["placeholders"];
}): MembersPayload {
  const publicSnap = toPublicSnapshot(
    state.canaries,
    state.asOf,
    state.fixture,
    state.fixtureLabel
  );
  const weightSum = Number(
    state.canaries.reduce((acc, c) => acc + c.weight, 0).toFixed(2)
  );
  return {
    ...publicSnap,
    weightSum,
    letterArchive: state.letterArchive,
    placeholders: state.placeholders,
    canaries: state.canaries.map((c) => ({
      ...c,
      numericScore: numericScore(c.score),
      contribution: contributionOf(c),
    })),
  };
}
