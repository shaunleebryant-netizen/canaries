/**
 * PRIVATE owner data — Cboe delayed options are personal, non-commercial use only.
 * Import this ONLY from server code under src/app/owner/** (never from a client component,
 * a member/public page or an unauthenticated API). The file lives in data/private/ (gitignored,
 * not in public/), so it is compiled into the server bundle only and never shipped as a static asset.
 * Paused (owner 2026-10-02): no nightly Cboe pull. Last written by scripts/scan-options-scanner.mjs (via refresh:full-pack step 9).
 * Missing file → scripts/ensure-private-data.mjs writes a placeholder before build.
 */
import optionsScanJson from "../../../data/private/options-scan.json";

export type OptionsUnusual = {
  ticker: string;
  type: "call" | "put";
  strike: number;
  expiry: string;
  dte: number;
  volume: number;
  oi: number;
  volOi: number | null;
  iv: number | null;
  mid: number;
  premium: number;
  label: string;
  pctFromSpot: number;
};
export type OptionsLean = {
  ticker: string;
  callVol: number;
  putVol: number;
  callPrem: number;
  putPrem: number;
  callPremShare: number | null;
  lean: "call" | "put" | null;
};
export type OptionsIvSpike = {
  ticker: string;
  iv30: number;
  iv30ChangePct: number | null;
  atmIv: number | null;
  hv20: number | null;
  ivHv: number | null;
};
/** Mirrors scripts/lib/options-scan-config.mjs `thresholds` (copied into each scan output). */
export type OptionsThresholds = {
  MIN_DTE: number;
  DEEP_ITM_PCT: number;
  UNUSUAL_VOL_OI: number;
  UNUSUAL_MIN_VOL: number;
  UNUSUAL_MIN_PREMIUM: number;
  LEAN_SHARE: number;
  LEAN_MIN_PREMIUM: number;
  LEAN_MIN_VOLUME: number;
  IV_HV_SPIKE: number;
  IV30_DAY_CHANGE_SPIKE_PCT: number;
  HV_LEN: number;
};
export type StackConfirm = {
  status: "pending" | "unknown" | "confirmed" | "not_confirmed";
  next?: string;
  oiChange?: number;
  needed: number;
};
export type StackRow = {
  sym: string;
  ticker: string;
  type: "call" | "put";
  strike: number;
  expiry: string;
  flagDate: string;
  dte: number;
  dteNow: number;
  volume: number;
  oi: number;
  volOi: number | null;
  premium: number;
  iv: number | null;
  mid: number;
  bid: number;
  ask: number;
  last: number;
  aggr: "ask" | "bid" | "mid" | null;
  spot: number;
  moneyness: "ATM" | "OTM" | "ITM";
  pctFromSpot: number;
  strictOtm: boolean;
  flagged: boolean;
  repeat: number;
  confirm: StackConfirm;
};
export type RepeatRow = StackRow & {
  flaggedOn: string[];
  combinedPremium: number;
  latest: { volume: number; oi: number; volOi: number | null };
  oiChangeSinceFirst: number;
  confirmations: (StackConfirm & { date: string })[];
};
export type OptionsStacks = {
  lookbackDates: string[];
  aggressive: { total: number; rows: StackRow[] };
  swing: { total: number; rows: StackRow[] };
  repeat: { total: number; rows: RepeatRow[]; building: boolean; sessionsSoFar: number; needSessions: number };
};
/** Mirrors scripts/lib/options-scan-config.mjs `proxies` + `stacks` (copied into each scan output). */
export type OptionsStackConfig = {
  proxies: { AT_ASK_SPREAD_FRACTION: number; OPEN_CONFIRM_SHARE: number };
  stacks: {
    LOOKBACK_SESSIONS: number;
    MAX_ROWS: number;
    aggressive: { MIN_PREMIUM: number; MIN_VOL_OI: number; REQUIRE_AT_ASK: boolean; MIN_DTE: number; MAX_DTE: number; SINGLE_NAMES_ONLY: boolean };
    swing: { MIN_PREMIUM: number; OTM_ONLY: boolean; MIN_DTE: number; MAX_DTE: number; MIN_VOL_OI: number; SINGLE_NAMES_ONLY: boolean; CONFIRMED_FIRST: boolean };
    repeat: { WINDOW_SESSIONS: number; MIN_SESSIONS: number; MIN_COMBINED_PREMIUM: number; LATEST_MIN_VOL_OI: number };
    EXCLUDE_TICKERS: string[];
  };
  history?: { KEEP_SESSIONS: number };
};
export type OptionsScan = {
  asOf: string | null;
  asOfSession: string | null;
  held: boolean;
  heldSince: string | null;
  /** Nightly Cboe download paused (owner 2026-09-28; scripts/lib/options-scan-switch.mjs). */
  paused: boolean;
  pausedSince: string | null;
  placeholder?: boolean;
  generatedAt?: string | null;
  thresholds?: Partial<OptionsThresholds>;
  counts?: { universe?: number; scanned: number; ok: number; failures?: number; unusual: number; leans: number; ivSpikes: number };
  unusual: OptionsUnusual[];
  leans: OptionsLean[];
  ivSpikes: OptionsIvSpike[];
  stacks?: OptionsStacks | null;
  config?: OptionsStackConfig | null;
  historyInfo?: { sessions: number; dates: string[] } | null;
};

export function loadOwnerOptionsScan(): OptionsScan {
  const raw = optionsScanJson as unknown as Partial<OptionsScan>;
  return {
    asOf: raw.asOf ?? null,
    asOfSession: raw.asOfSession ?? null,
    held: Boolean(raw.held),
    heldSince: raw.heldSince ?? null,
    // Paused unless the doc says otherwise AND OPTIONS_SCAN_ENABLED=true is set (fail towards "paused").
    paused: Boolean(raw.paused) || process.env.OPTIONS_SCAN_ENABLED !== "true",
    pausedSince: raw.pausedSince ?? "2026-09-28",
    placeholder: Boolean(raw.placeholder),
    generatedAt: raw.generatedAt ?? null,
    thresholds: raw.thresholds ?? {},
    counts: raw.counts,
    unusual: Array.isArray(raw.unusual) ? raw.unusual : [],
    leans: Array.isArray(raw.leans) ? raw.leans : [],
    ivSpikes: Array.isArray(raw.ivSpikes) ? raw.ivSpikes : [],
    stacks: raw.stacks ?? null,
    config: raw.config ?? null,
    historyInfo: raw.historyInfo ? { sessions: raw.historyInfo.sessions, dates: raw.historyInfo.dates } : null,
  };
}
