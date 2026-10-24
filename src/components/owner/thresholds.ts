import type { OptionsStackConfig } from "@/lib/owner/optionsScan";

/** Display fallback only — the source of truth is scripts/lib/options-scan-config.mjs (copied into each scan). */
export const DEFAULT_STACK_CONFIG: OptionsStackConfig = {
  proxies: { AT_ASK_SPREAD_FRACTION: 0.5, OPEN_CONFIRM_SHARE: 0.5 },
  stacks: {
    LOOKBACK_SESSIONS: 2,
    MAX_ROWS: 40,
    aggressive: { MIN_PREMIUM: 250_000, MIN_VOL_OI: 5, REQUIRE_AT_ASK: true, MIN_DTE: 7, MAX_DTE: 45, SINGLE_NAMES_ONLY: true },
    swing: { MIN_PREMIUM: 500_000, OTM_ONLY: true, MIN_DTE: 14, MAX_DTE: 180, MIN_VOL_OI: 2, SINGLE_NAMES_ONLY: true, CONFIRMED_FIRST: true },
    repeat: { WINDOW_SESSIONS: 10, MIN_SESSIONS: 2, MIN_COMBINED_PREMIUM: 250_000, LATEST_MIN_VOL_OI: 2 },
    EXCLUDE_TICKERS: [],
  },
};
