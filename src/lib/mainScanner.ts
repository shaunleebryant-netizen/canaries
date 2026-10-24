/**
 * Main Scanner — Bullish Setups + Bearish Setups computed from the same pack
 * data at one as-of date (full-pack sessionDate). Rules live in
 * setupsCore.mjs (shared with scripts/refresh-full-pack.mjs).
 */

import manifestJson from "../../data/full-pack-manifest.json";
import marketStateJson from "../../data/market-state.json";
import historyJson from "../../data/setups-history.json";
import { applySetupsHistory, computeMainScanner } from "@/lib/setupsCore.mjs";
import type { FishAlert } from "@/lib/loadFishAlerts";
import type { EtfWatchAlert } from "@/lib/loadEtfWatchAlerts";
import type { MoneyFlowAlert } from "@/lib/loadMoneyFlowAlerts";
import type { ExhaustionAlert } from "@/lib/loadExhaustionAlerts";
import type { IbdSetupAlert } from "@/lib/loadIbdSetupsAlerts";
import type { MarketStateRow, Monthly20Signal } from "@/lib/marketState";
import type { BullishSetup } from "@/lib/bullishSetups";
import type { BearishSetup } from "@/lib/bearishSetups";

/** Shared pack as-of (YYYY-MM-DD) used for the 14-day print window. */
export function loadPackAsOf(): string {
  const m = manifestJson as { sessionDate?: string };
  const s = marketStateJson as { sessionDate?: string; asOf?: string };
  return (m.sessionDate || s.sessionDate || s.asOf || "").slice(0, 10);
}

export function computeMainScannerSetups(input: {
  asOf: string;
  fish: FishAlert[];
  etfWatch: EtfWatchAlert[];
  moneyFlow: MoneyFlowAlert[];
  mfiSessionDates?: string[];
  exhaustion: ExhaustionAlert[];
  ibd: IbdSetupAlert[];
  marketStates: MarketStateRow[];
  monthly20: Monthly20Signal[];
}): {
  asOf: string;
  bullish: BullishSetup[];
  bearish: BearishSetup[];
  /** Every ticker's current conditions (My Stocks preview, t583u). */
  conditionsByTicker: ReturnType<typeof computeMainScanner>["conditionsByTicker"];
} {
  // Added dates carried from data/setups-history.json (written by the pack).
  const raw = computeMainScanner(input);
  const { asOf, bullish, bearish } = applySetupsHistory(raw, historyJson);
  return { asOf, bullish, bearish, conditionsByTicker: raw.conditionsByTicker };
}
