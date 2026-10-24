/**
 * Bullish Setups (Main Scanner; formerly "Interesting Setups").
 * Tickers with ≥2 distinct bullish conditions across the Sub Scanners:
 * 🐟 Fish · 😊 Smiley (Fish box or ETF Watch) · 💵 MFI Washout v6.1 (last 5 trading days) — other prints within 14
 * calendar days of the pack as-of; 🟢 weekly bull (green, counted once);
 * 📈 Monthly 20MA cross; IBD setup. Logic: setupsCore.mjs.
 */

import type {
  BullishConditionId,
  MainScannerSetup,
} from "@/lib/setupsCore.mjs";
export {
  SETUPS_MIN_CONDITIONS,
  SETUPS_WINDOW_DAYS,
} from "@/lib/setupsCore.mjs";

export type BullishSetup = MainScannerSetup<BullishConditionId>;
