/**
 * Options Scanner config — the ONE place for every tested threshold/filter of the private owner
 * page /owner (scripts/scan-options-scanner.mjs). Settings & filters UI will edit this next.
 * Values are the ones tested on 2026-09-25 (see docs/ops/owner-options.md).
 */
export const OPTIONS_SCAN_CONFIG = {
  thresholds: {
    MIN_DTE: 4, // skip 0–3 DTE (owner rule), all sections
    DEEP_ITM_PCT: 10, // exclude contracts >10% in the money (spread/stock-replacement legs; premium is intrinsic)
    // Unusual contracts
    UNUSUAL_VOL_OI: 3, // volume ≥ 3× open interest
    UNUSUAL_MIN_VOL: 500,
    UNUSUAL_MIN_PREMIUM: 100_000, // est. premium = volume × mid × 100, US$
    UNUSUAL_MAX_ROWS: 25,
    // Call/put leans (per ticker)
    LEAN_SHARE: 0.75, // one side ≥ 75% of premium
    LEAN_MIN_PREMIUM: 1_000_000,
    LEAN_MIN_VOLUME: 2_000,
    // IV spikes
    IV_HV_SPIKE: 1.5, // Cboe IV30 / HV20 ≥ 1.5
    IV30_DAY_CHANGE_SPIKE_PCT: 15, // or IV30 up ≥ 15% vs previous session
    HV_LEN: 20,
    ATM_MIN_DTE: 7,
  },
  // Proxies (free Cboe EOD chain has no prints, no sweep/block tags, no trade side — see docs/ops/owner-options.md)
  proxies: {
    // "Last print at/above ask": last_trade_price ≥ mid + AT_ASK_SPREAD_FRACTION × (ask − mid), i.e. in the top
    // quarter of the closing bid/ask spread (0.5) — needs bid > 0, ask > 0 and the last trade on the session date.
    // Mirror rule for "at/below bid". The quote is the closing quote, not the quote at the time of that print.
    AT_ASK_SPREAD_FRACTION: 0.5,
    // "Opening confirmed": next session's OI − this session's (start-of-day) OI ≥ 50% of the flagged volume.
    OPEN_CONFIRM_SHARE: 0.5,
  },
  // Snapshot + history (data/private/options-contract-history.json) for confirmation and repeat flow.
  history: {
    KEEP_SESSIONS: 60,
    RAW_KEEP_SESSIONS: 5, // raw gz chains in data/private/raw/<session>/ (for offline re-runs)
    SNAPSHOT_MIN_VOL: 500, // contracts stored per session = superset of every stack's filter
    SNAPSHOT_MIN_PREMIUM: 100_000,
    SNAPSHOT_MIN_VOL_OI: 1,
    // A contract is "flagged" on a session when it meets the unusual rule (UNUSUAL_* thresholds above).
  },
  // The three filter stacks on /owner (main view). Rows come from the latest session plus LOOKBACK_SESSIONS − 1
  // earlier sessions so yesterday's flags show their opening confirmation.
  stacks: {
    LOOKBACK_SESSIONS: 2,
    MAX_ROWS: 40,
    aggressive: {
      MIN_PREMIUM: 250_000,
      MIN_VOL_OI: 5, // OI 0 counts as "new" (passes)
      REQUIRE_AT_ASK: true, // last print at/above ask (bought proxy)
      MIN_DTE: 7,
      MAX_DTE: 45,
      SINGLE_NAMES_ONLY: true, // Cboe security_type === "stock"
    },
    swing: {
      MIN_PREMIUM: 500_000,
      OTM_ONLY: true, // calls strike > spot, puts strike < spot
      MIN_DTE: 14,
      MAX_DTE: 180,
      MIN_VOL_OI: 2, // owner 2026-09-26: volume ≥ 2× start-of-day OI (was 1×)
      SINGLE_NAMES_ONLY: true,
      CONFIRMED_FIRST: true,
    },
    repeat: {
      WINDOW_SESSIONS: 10,
      MIN_SESSIONS: 2,
      MIN_COMBINED_PREMIUM: 250_000, // configurable up to 500k
      LATEST_MIN_VOL_OI: 2, // still elevated on the latest session
    },
    // Extra tickers treated as non-single-name (e.g. crypto-treasury stocks) — empty by default.
    EXCLUDE_TICKERS: [],
  },
  fetch: {
    CONCURRENCY: 1, // Cboe CDN rate-limits bursts — stay polite
    GAP_MS: 500,
    BACKOFF_MS: [3000, 8000, 20000, 40000],
    MIN_OK_SHARE: 0.8, // held if fewer than 80% of tickers load
  },
  noOptions: ["BTCUSD", "ETHUSD", "XAUUSD", "XAGUSD", "SOLUSD", "BNBUSD", "XRPUSD", "TOTAL", "SPX", "SP600"],
};
