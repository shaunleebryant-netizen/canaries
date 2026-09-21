/**
 * Load Vol Curve Canary stub for members.
 * Never invent prints — missing VIX / VIX3M → PENDING neutrals.
 * DRAFT — do not deploy / do not set draft:false.
 */
import stubJson from "../../data/vol-curve-stub.json";
import {
  computeVolCurve,
  type ComputeVolCurveResult,
  type VolCurveHygIefInput,
} from "./volCurve/computeVolCurve";

export type { ComputeVolCurveResult };

export interface VolCurveStubPayload extends ComputeVolCurveResult {
  draft: boolean;
  /** Raw seed prints for UI tiles (may be null / PENDING). */
  feeds: {
    vix: { value: number | null; status: string };
    vix3m: { value: number | null; status: string };
  };
}

type StubFile = {
  draft?: boolean;
  asOf?: string;
  feeds?: {
    vix?: { value?: number | null; status?: string };
    vix3m?: { value?: number | null; status?: string };
    hygIef?: {
      ratio?: number | null;
      sma20?: number | null;
      rollingOver?: boolean | null;
      status?: string;
    };
  };
  mediumHistory?: number[];
};

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return null;
}

export function loadVolCurve(): VolCurveStubPayload {
  const stub = stubJson as StubFile;
  const feeds = stub.feeds ?? {};

  const vix = numOrNull(feeds.vix?.value);
  const vix3m = numOrNull(feeds.vix3m?.value);

  const hygRaw = feeds.hygIef;
  const hygIef: VolCurveHygIefInput | null = hygRaw
    ? {
        ratio: numOrNull(hygRaw.ratio),
        sma20: numOrNull(hygRaw.sma20),
        rollingOver: hygRaw.rollingOver ?? null,
        status: hygRaw.status,
      }
    : null;

  const result = computeVolCurve({
    asOf: stub.asOf,
    vix,
    vix3m,
    mediumHistory: stub.mediumHistory ?? [],
    hygIef,
  });

  return {
    ...result,
    draft: stub.draft !== false,
    feeds: {
      vix: {
        value: vix,
        status: feeds.vix?.status ?? (vix == null ? "PENDING" : "VERIFIED"),
      },
      vix3m: {
        value: vix3m,
        status:
          feeds.vix3m?.status ?? (vix3m == null ? "PENDING" : "VERIFIED"),
      },
    },
  };
}
