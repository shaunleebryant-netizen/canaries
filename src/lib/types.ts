/** Score band for a single canary reading. Live packs may use null + status UNVERIFIED. */
export type CanaryScore = -2 | -1 | 0 | 1 | 2 | "UNVERIFIED" | null;

export type TrafficLight = "Green" | "Amber" | "Red";

export type Stance =
  | "Stay in the market"
  | "Stay alert"
  | "Get defensive";

export type PackMark = "VERIFIED" | "PARTIAL_VERIFIED" | "UNVERIFIED" | string;

export interface CanaryReading {
  id: string;
  name: string;
  description: string;
  /** Nominal / display weight (weights.md). Prefer weightEffective for math when present. */
  weight: number;
  weightNominal?: number;
  weightEffective?: number;
  score: CanaryScore;
  lastReading: string;
  readingUnit: string;
  oneSentenceRead: string;
  /** Optional 13-wk history; live packs may omit until history lands. */
  sparkline?: number[];
  statusHint?: string;
  verified?: boolean;
  status?: string;
  /** Precomputed contribution from Scorekeeper when present — do not invent. */
  contribution?: number | null;
  rationale?: string;
  vs_9D?: string;
  block?: string;
}

export interface LetterArchiveItem {
  id: string;
  title: string;
  publishedAt: string;
  summary: string;
}

export interface CompositeBlock {
  S: number;
  light: string;
  lightBeforeVeto?: string;
  bands?: Record<string, string>;
  priorPartial?: {
    S: number;
    light: string;
    note?: string;
  };
}

export interface VetoBlock {
  triggered: boolean;
  rule?: string;
  inputs?: Record<string, unknown>;
}

export interface RenormalizationBlock {
  droppedNominalWeight: number;
  activeNominalSum: number;
  note?: string;
}

export interface CanaryState {
  asOf: string;
  sessionDate?: string;
  fixture: boolean;
  /** Present on fixture packs; omitted on live. */
  fixtureLabel?: string;
  packMark?: PackMark;
  verificationFile?: string;
  readingsFile?: string;
  readRulesFile?: string;
  weightsFile?: string;
  vs_9D?: string;
  /** Prefer this over recomputing when Scorekeeper wrote it. */
  composite?: CompositeBlock;
  veto?: VetoBlock;
  flags?: string[];
  unverified?: string[];
  renormalization?: RenormalizationBlock;
  notes?: string[];
  weightageTable?: Array<Record<string, unknown>>;
  canaries: CanaryReading[];
  letterArchive: LetterArchiveItem[];
  placeholders: {
    tradingViewIndicatorsUrl: string;
    bookTuitionUrl: string;
  };
}

export interface PublicSnapshot {
  light: TrafficLight;
  S: number;
  asOf: string;
  stance: Stance;
  fixture: boolean;
  fixtureLabel?: string;
  vetoApplied: boolean;
}

export interface MembersPayload extends PublicSnapshot {
  canaries: Array<
    CanaryReading & {
      contribution: number | null;
      numericScore: number | null;
      displayWeight: number;
    }
  >;
  letterArchive: LetterArchiveItem[];
  placeholders: CanaryState["placeholders"];
  weightSum: number;
  packMark?: PackMark;
  unverified?: string[];
  renormalization?: RenormalizationBlock;
}
