import {
  computeRegime,
  type ComputeRegimeResult,
  type RegimeHistoryFile,
} from "./regime/computeRegime";
import type { CanaryReading } from "./types";
import historyJson from "../../data/regime-history.json";
import volStubJson from "../../data/vol-curve-stub.json";
import { ratioOrNull } from "./volCurve/computeVolCurve";

export type { ComputeRegimeResult };

export interface RegimeStubPayload extends ComputeRegimeResult {
  draft: boolean;
}

/**
 * Build members Regime box from live canary scores (6 ids only).
 * Optional VIX/VIX3M mediumRatio from vol-curve stub feeds when present.
 */
export function loadRegimeFromCanaries(
  canaries: CanaryReading[],
  asOf?: string
): RegimeStubPayload {
  const history = historyJson as RegimeHistoryFile;
  const volStub = volStubJson as {
    feeds?: {
      vix?: { value?: number | null };
      vix3m?: { value?: number | null };
    };
  };

  const mediumRatio = ratioOrNull(
    volStub.feeds?.vix?.value,
    volStub.feeds?.vix3m?.value
  );

  const result = computeRegime(canaries, {
    asOf: asOf ?? history.asOf,
    history,
    mediumRatio,
  });

  return {
    ...result,
    // Regime v2 is live (old regime-stub.json archived 2026-09-25).
    draft: false,
  };
}

/** @deprecated Prefer loadRegimeFromCanaries(state.canaries). Kept so old imports compile. */
export function loadRegime(): RegimeStubPayload {
  return loadRegimeFromCanaries([]);
}
