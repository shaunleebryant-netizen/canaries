/** Score band for a single canary reading. */
export type CanaryScore = -2 | -1 | 0 | 1 | 2 | "UNVERIFIED";

export type TrafficLight = "Green" | "Amber" | "Red";

export type Stance =
  | "Stay in the market"
  | "Stay alert"
  | "Get defensive";

export interface CanaryReading {
  id: string;
  name: string;
  description: string;
  weight: number;
  score: CanaryScore;
  lastReading: string;
  readingUnit: string;
  oneSentenceRead: string;
  sparkline: number[];
  statusHint?: string;
}

export interface LetterArchiveItem {
  id: string;
  title: string;
  publishedAt: string;
  summary: string;
}

export interface CanaryState {
  asOf: string;
  fixture: boolean;
  fixtureLabel: string;
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
    }
  >;
  letterArchive: LetterArchiveItem[];
  placeholders: CanaryState["placeholders"];
  weightSum: number;
}
