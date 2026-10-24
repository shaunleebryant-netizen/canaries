export declare const SETUPS_WINDOW_DAYS: number;
export declare const MFI_WINDOW_TRADING_DAYS: number;
export declare function mfiCutoffDate(asOf: string, sessionDates?: string[]): string;
export declare const SETUPS_MIN_CONDITIONS: number;
export declare const SETUPS_RULES_VERSION: number;
export declare const BULLISH_TIMING_IDS: string[];
export declare const BEARISH_TIMING_IDS: string[];

export type BullishConditionId =
  | "fish"
  | "smile"
  | "mfi_os"
  | "weekly_bull"
  | "monthly_20ma"
  | "ibd";
export type BearishConditionId = "mfi_ob" | "sweaty" | "skull" | "weekly_bear";

export interface SetupCondition<Id extends string = string> {
  id: Id;
  /** Date this condition became true (earliest in-window print, state start, cross month, IBD date). */
  since: string | null;
  source?: string;
  weeks?: number;
  dots?: number;
  detail: string;
}

export interface MainScannerSetup<Id extends string = string> {
  ticker: string;
  count: number;
  /** Date the ticker qualified (history-carried when still qualified). */
  added: string;
  /** Date the 2nd condition became true, from this run's data alone. */
  computedAdded: string;
  conditions: SetupCondition<Id>[];
}

export interface MainScannerInput {
  asOf: string;
  fish?: unknown[];
  etfWatch?: unknown[];
  moneyFlow?: unknown[];
  /** Trading-session dates (money-flow-alerts.json sessionDates) for the 5-trading-day 💵 rule. */
  mfiSessionDates?: string[];
  exhaustion?: unknown[];
  ibd?: unknown[];
  marketStates?: unknown[];
  monthly20?: unknown[];
}

export declare function daysBefore(asOf: string, d: string): number;
export declare function kindDate(row: unknown, kind: string): string | null;
export declare function computeMainScanner(input: MainScannerInput): {
  asOf: string;
  bullish: MainScannerSetup<BullishConditionId>[];
  bearish: MainScannerSetup<BearishConditionId>[];
  /** Tickers that met Bullish but were left out because they also meet Bearish. */
  excludedFromBullish: string[];
  /** Every ticker's current conditions before the 2-condition rule (My Stocks, t583u). */
  conditionsByTicker: Record<string, { bull: SetupCondition<BullishConditionId>[]; bear: SetupCondition<BearishConditionId>[] }>;
};

export interface SetupsHistoryEntry {
  added: string;
  count: number;
  conditions: string[];
  lastQualifiedAsOf: string;
}
export interface SetupsHistory {
  asOf: string;
  rulesVersion?: number;
  note?: string;
  bullish: Record<string, SetupsHistoryEntry>;
  bearish: Record<string, SetupsHistoryEntry>;
  excludedFromBullish?: string[];
}
export declare function sortSetups<T extends { count: number; added: string; ticker: string }>(rows: T[]): T[];
export declare function applySetupsHistory(
  result: {
    asOf: string;
    bullish: MainScannerSetup<BullishConditionId>[];
    bearish: MainScannerSetup<BearishConditionId>[];
    excludedFromBullish?: string[];
  },
  prevHistory: unknown
): {
  asOf: string;
  bullish: MainScannerSetup<BullishConditionId>[];
  bearish: MainScannerSetup<BearishConditionId>[];
  excludedFromBullish: string[];
  history: SetupsHistory;
};
